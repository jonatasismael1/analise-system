import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Use POST." }, 405);

  const url = new URL(req.url);
  const clinicId = url.searchParams.get("clinicId");
  if (!clinicId) return jsonResponse({ ok: false, error: "clinicId obrigatorio." }, 400);

  let body: any = {};
  try { body = await req.json(); } catch { return jsonResponse({ ok: false, error: "Body invalido." }, 400); }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const evolutionUrl = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/$/, "");
  const evolutionKey = Deno.env.get("EVOLUTION_API_KEY") ?? "";

  // instanceName vem do proprio payload da Evolution API
  const instanceName: string = body.instance ?? body.sender ?? "analise-saude";

  const event: string = body.event ?? body.Event ?? "";
  const data: any = body.data ?? {};
  const eventKey = event.toLowerCase().replace(/[^a-z]/g, "");

  try {
    if (eventKey === "messagesupsert" || eventKey === "messagesupserted") {
      await handleMessagesUpsert(supabase, clinicId, instanceName, evolutionUrl, evolutionKey, data);
    }
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error("[evolution-webhook] erro:", err);
    return jsonResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

async function upsertAndGet(
  supabase: any,
  table: string,
  row: Record<string, unknown>,
  conflict: string,
  lookupCol: string,
  lookupVal: string,
  clinicId: string
): Promise<string | null> {
  const { error: upsertErr } = await supabase.from(table).upsert(row, { onConflict: conflict });
  if (upsertErr) { console.error(`[evolution-webhook] upsert ${table}:`, upsertErr.message); return null; }
  const { data, error: selErr } = await supabase.from(table).select("id").eq("clinica_id", clinicId).eq(lookupCol, lookupVal).single();
  if (selErr) { console.error(`[evolution-webhook] select ${table}:`, selErr.message); return null; }
  return data?.id ?? null;
}

function detectTipo(msgBody: any): "text" | "image" | "video" | "audio" | "document" {
  if (msgBody.imageMessage || msgBody.stickerMessage) return "image";
  if (msgBody.videoMessage)                           return "video";
  if (msgBody.audioMessage || msgBody.pttMessage)    return "audio";
  if (msgBody.documentMessage)                        return "document";
  return "text";
}

function extractTexto(msgBody: any, tipo: string): string | null {
  if (tipo === "text")     return msgBody.conversation ?? msgBody.extendedTextMessage?.text ?? null;
  if (tipo === "image")   return msgBody.imageMessage?.caption ?? msgBody.stickerMessage?.caption ?? null;
  if (tipo === "video")   return msgBody.videoMessage?.caption ?? null;
  if (tipo === "audio")   return null;
  if (tipo === "document") return msgBody.documentMessage?.caption ?? msgBody.documentMessage?.fileName ?? null;
  return null;
}

/**
 * Baixa a midia via Evolution API e faz upload no Supabase Storage.
 * Retorna a URL publica ou null se falhar.
 */
async function downloadAndUploadMedia(
  supabase: any,
  evolutionUrl: string,
  evolutionKey: string,
  instanceName: string,
  msg: any,
  clinicId: string,
  conversaId: string,
  tipo: string
): Promise<string | null> {
  if (!evolutionUrl || !evolutionKey) return null;
  // Videos podem ser muito grandes — pula para nao travar o webhook
  if (tipo === "video") return null;

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${evolutionUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": evolutionKey },
      body: JSON.stringify({ message: msg }),
      signal: controller.signal,
    });
    clearTimeout(tid);

    if (!res.ok) {
      console.warn("[evolution-webhook] getBase64 nao-ok:", res.status);
      return null;
    }

    const result: any = await res.json();
    const item = Array.isArray(result) ? result[0] : result;
    const base64Raw: string = item?.base64 ?? item?.data ?? "";
    if (!base64Raw) return null;

    const mimeType: string = item?.mimetype ?? item?.mimeType ?? "application/octet-stream";
    const ext = (mimeType.split("/")[1] ?? "bin").split(";")[0];

    const b64 = base64Raw.includes(",") ? base64Raw.split(",")[1] : base64Raw;

    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const path = `${clinicId}/${conversaId}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("whatsapp-media")
      .upload(path, bytes, { contentType: mimeType, upsert: false });

    if (uploadErr) {
      console.error("[evolution-webhook] upload storage:", uploadErr.message);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage.from("whatsapp-media").getPublicUrl(path);
    return publicUrl;
  } catch (err) {
    console.warn("[evolution-webhook] downloadAndUploadMedia falhou:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function handleMessagesUpsert(
  supabase: any,
  clinicId: string,
  instanceName: string,
  evolutionUrl: string,
  evolutionKey: string,
  data: any
) {
  const messages: any[] = Array.isArray(data) ? data : [data];

  for (const msg of messages) {
    const key = msg?.key ?? {};
    const remoteJid: string = key.remoteJid ?? "";
    const fromMe: boolean = Boolean(key.fromMe);
    const messageId: string = key.id ?? "";
    const pushName: string = msg.pushName ?? "";

    if (!remoteJid || remoteJid.includes("@g.us") || remoteJid === "status@broadcast") continue;
    // Mensagens enviadas pelo SaaS ja sao salvas diretamente — ignora echo fromMe
    if (fromMe) continue;

    const msgBody = msg.message ?? {};
    const tipo = detectTipo(msgBody);
    const texto = extractTexto(msgBody, tipo);

    const enviada_em = msg.messageTimestamp
      ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
      : new Date().toISOString();

    const telefone = remoteJid.replace(/@s\.whatsapp\.net$/, "").replace(/@c\.us$/, "");

    const contatoId = await upsertAndGet(
      supabase, "whatsapp_contatos",
      { clinica_id: clinicId, chat_id: remoteJid, telefone, nome: pushName || null },
      "clinica_id,chat_id", "chat_id", remoteJid, clinicId
    );
    if (!contatoId) continue;

    const ultimoTexto = texto ?? `[${tipo}]`;
    const conversaId = await upsertAndGet(
      supabase, "whatsapp_conversas",
      { clinica_id: clinicId, contato_id: contatoId, chat_id: remoteJid, ultimo_texto: ultimoTexto, ultima_mensagem_em: enviada_em, status: "aberta" },
      "clinica_id,chat_id", "chat_id", remoteJid, clinicId
    );
    if (!conversaId) continue;

    // Dedup por waha_message_id
    if (messageId) {
      const { count } = await supabase
        .from("whatsapp_mensagens")
        .select("id", { count: "exact", head: true })
        .eq("clinica_id", clinicId)
        .eq("waha_message_id", messageId);
      if ((count ?? 0) > 0) continue;
    }

    // Tenta baixar e salvar midia recebida no Storage
    let mediaUrl: string | null = null;
    if (tipo !== "text") {
      mediaUrl = await downloadAndUploadMedia(
        supabase, evolutionUrl, evolutionKey, instanceName, msg, clinicId, conversaId, tipo
      );
    }

    const { error: msgErr } = await supabase.from("whatsapp_mensagens").insert({
      clinica_id: clinicId,
      conversa_id: conversaId,
      contato_id: contatoId,
      waha_message_id: messageId || null,
      direcao: "in",
      tipo,
      texto,
      media_url: mediaUrl,
      payload: msg,
      enviada_em,
    });
    if (msgErr) console.error("[evolution-webhook] insert mensagem:", msgErr.message);
    else console.log(`[evolution-webhook] salvo: tipo=${tipo} media=${mediaUrl ? "sim" : "nao"}`);
  }
}
