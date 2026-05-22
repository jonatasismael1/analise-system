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
    } else if (eventKey === "messagesupdate" || eventKey === "messagesupdated") {
      await handleMessagesUpdate(supabase, clinicId, data);
    } else if (eventKey === "contactsupsert" || eventKey === "contactsupserted" || eventKey === "contactsupdate") {
      await handleContactsUpsert(supabase, clinicId, data);
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

function detectTipo(msgBody: any): "text" | "image" | "video" | "audio" | "document" | "sticker" {
  if (msgBody.stickerMessage)                         return "sticker";
  if (msgBody.imageMessage)                           return "image";
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
  // Mensagens enviadas pelo celular (fromMe) raramente têm mídia disponível
  // na cache da Evolution API — pula o download para não desperdiçar timeout
  const fromMe: boolean = Boolean(msg?.key?.fromMe);
  if (fromMe && tipo === "audio") return null;

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
    const base64Raw: string = item?.base64 ?? item?.data ?? item?.mediaData ?? "";
    if (!base64Raw) {
      console.warn("[evolution-webhook] getBase64 retornou vazio. keys:", Object.keys(item ?? {}).join(","));
      return null;
    }

    const rawMime: string = item?.mimetype ?? item?.mimeType ?? item?.mediaType ?? "application/octet-stream";
    // Normaliza MIME: "audio/ogg; codecs=opus" → "audio/ogg"
    const mimeType = rawMime.split(";")[0].trim();
    const ext = mimeType.split("/")[1] ?? "bin";

    const b64 = base64Raw.includes(",") ? base64Raw.split(",")[1] : base64Raw;

    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const path = `${clinicId}/${conversaId}/${Date.now()}.${ext}`;
    console.log(`[evolution-webhook] upload storage: path=${path} mime=${mimeType} bytes=${bytes.length}`);
    const { error: uploadErr } = await supabase.storage
      .from("whatsapp-media")
      .upload(path, bytes, { contentType: mimeType, upsert: false });

    if (uploadErr) {
      console.error("[evolution-webhook] upload storage ERRO:", uploadErr.message, "mime:", mimeType);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage.from("whatsapp-media").getPublicUrl(path);
    return publicUrl;
  } catch (err) {
    console.warn("[evolution-webhook] downloadAndUploadMedia falhou:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function handleContactsUpsert(supabase: any, clinicId: string, data: any) {
  const contacts: any[] = Array.isArray(data) ? data : [data];
  let saved = 0;

  for (const c of contacts) {
    const rawJid: string = c.id ?? c.remoteJid ?? c.jid ?? "";
    if (!rawJid || rawJid.includes("@g.us") || rawJid === "status@broadcast") continue;

    const chatId = rawJid.endsWith("@s.whatsapp.net")
      ? rawJid
      : `${rawJid.replace(/\D/g, "")}@s.whatsapp.net`;
    const telefone = chatId.replace("@s.whatsapp.net", "");
    if (telefone.length < 8) continue;

    const { error } = await supabase.from("whatsapp_contatos").upsert(
      {
        clinica_id: clinicId,
        chat_id: chatId,
        telefone,
        push_name: c.pushName ?? c.notify ?? c.name ?? c.verifiedName ?? null,
        profile_pic_url: c.profilePictureUrl ?? c.profilePicUrl ?? c.imgUrl ?? null,
        origem: "evolution",
      },
      { onConflict: "clinica_id,chat_id" }
    );
    if (error) console.error("[evolution-webhook] upsert contato:", error.message);
    else saved++;
  }
  console.log(`[evolution-webhook] contacts.upsert: ${saved}/${contacts.length} salvos`);
}

/**
 * Processa MESSAGES_UPDATE da Evolution API.
 * Trata dois casos:
 *   - Revogação (exclusão no WhatsApp): protocolMessage.type === "REVOKE"
 *   - Edição de mensagem: editedMessage presente
 */
async function handleMessagesUpdate(supabase: any, clinicId: string, data: any) {
  const updates: any[] = Array.isArray(data) ? data : [data];

  for (const upd of updates) {
    const key = upd?.key ?? {};
    const waha_message_id: string = key.id ?? "";
    const fromMe: boolean = Boolean(key.fromMe);

    if (!waha_message_id) continue;

    const innerMsg = upd?.update?.message ?? {};
    const protocol = innerMsg.protocolMessage ?? null;
    const editedMessage = innerMsg.editedMessage ?? null;

    // --- Revogação (paciente apagou do próprio lado) ---
    if (protocol?.type === "REVOKE") {
      // O campo key dentro do protocolMessage identifica a mensagem original
      const originalId: string = protocol?.key?.id ?? waha_message_id;

      const { data: rows } = await supabase
        .from("whatsapp_mensagens")
        .select("id")
        .eq("clinica_id", clinicId)
        .eq("waha_message_id", originalId)
        .limit(1);

      if (!rows?.length) {
        console.warn("[evolution-webhook] REVOKE: mensagem nao encontrada:", originalId);
        continue;
      }

      const { error } = await supabase
        .from("whatsapp_mensagens")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          // fromMe = true → equipe apagou; fromMe = false → paciente apagou
          deleted_by: fromMe ? "equipe" : "paciente",
          delete_origin: "webhook",
        })
        .eq("id", rows[0].id);

      if (error) console.error("[evolution-webhook] REVOKE update:", error.message);
      else console.log("[evolution-webhook] REVOKE marcado:", originalId);
      continue;
    }

    // --- Edição de mensagem ---
    if (editedMessage) {
      const newText: string =
        editedMessage.conversation
        ?? editedMessage.extendedTextMessage?.text
        ?? editedMessage.message?.extendedTextMessage?.text
        ?? "";

      if (!newText) continue;

      // Busca a mensagem pelo waha_message_id para capturar o texto atual antes de sobrescrever
      const { data: rows } = await supabase
        .from("whatsapp_mensagens")
        .select("id, texto, is_edited, original_content")
        .eq("clinica_id", clinicId)
        .eq("waha_message_id", waha_message_id)
        .limit(1);

      if (!rows?.length) {
        console.warn("[evolution-webhook] EDIT: mensagem nao encontrada:", waha_message_id);
        continue;
      }

      const row = rows[0];
      const { error } = await supabase
        .from("whatsapp_mensagens")
        .update({
          texto: newText,
          is_edited: true,
          edited_at: new Date().toISOString(),
          edit_origin: fromMe ? "equipe" : "paciente",
          // Preserva o conteúdo original (apenas na primeira edição)
          original_content: row.is_edited ? row.original_content : row.texto,
        })
        .eq("id", row.id);

      if (error) console.error("[evolution-webhook] EDIT update:", error.message);
      else console.log("[evolution-webhook] EDIT salvo:", waha_message_id);
    }
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
    // fromMe = true: mensagem enviada pelo celular (exibir como "out")
    // fromMe = false: mensagem recebida (exibir como "in")

    const msgBody = msg.message ?? {};
    const tipo = detectTipo(msgBody);
    const texto = extractTexto(msgBody, tipo);

    const enviada_em = msg.messageTimestamp
      ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
      : new Date().toISOString();

    const telefone = remoteJid.replace(/@s\.whatsapp\.net$/, "").replace(/@c\.us$/, "");

    // Nao sobrescreve push_name do contato com nome do remetente (fromMe = voce)
    const contatoRow: Record<string, unknown> = { clinica_id: clinicId, chat_id: remoteJid, telefone };
    if (!fromMe && pushName) contatoRow.push_name = pushName;

    const contatoId = await upsertAndGet(
      supabase, "whatsapp_contatos",
      contatoRow,
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
      direcao: fromMe ? "out" : "in",
      tipo,
      texto,
      media_url: mediaUrl,
      payload: msg,
      enviada_em,
    });
    if (msgErr) console.error("[evolution-webhook] insert mensagem:", msgErr.message);
    else console.log(`[evolution-webhook] salvo: dir=${fromMe ? "out" : "in"} tipo=${tipo} media=${mediaUrl ? "sim" : "nao"}`);

    if (!fromMe && tipo === "text" && texto?.trim()) {
      await handleDebyAutoReply({
        supabase,
        clinicId,
        instanceName,
        evolutionUrl,
        evolutionKey,
        conversaId,
        contatoId,
        telefone,
        contatoNome: pushName || telefone,
      });
    }
  }
}

async function handleDebyAutoReply(input: {
  supabase: any;
  clinicId: string;
  instanceName: string;
  evolutionUrl: string;
  evolutionKey: string;
  conversaId: string;
  contatoId: string;
  telefone: string;
  contatoNome: string;
}) {
  const {
    supabase,
    clinicId,
    instanceName,
    evolutionUrl,
    evolutionKey,
    conversaId,
    contatoId,
    telefone,
    contatoNome,
  } = input;

  if (!evolutionUrl || !evolutionKey) return;

  const { data: conversa } = await supabase
    .from("whatsapp_conversas")
    .select("status, atendimento_status")
    .eq("clinica_id", clinicId)
    .eq("id", conversaId)
    .single();

  if (conversa?.status === "arquivada" || conversa?.status === "resolvida" || conversa?.atendimento_status === "humano") {
    return;
  }

  const { data: settings, error: settingsError } = await supabase
    .from("ai_conversation_settings")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("conversation_id", conversaId)
    .maybeSingle();

  if (settingsError) {
    console.error("[deby-auto] settings:", settingsError.message);
    return;
  }
  if (!settings?.ai_enabled || settings.human_takeover) return;

  const { data: agent } = settings.agent_id
    ? await supabase.from("ai_agents").select("*").eq("clinic_id", clinicId).eq("id", settings.agent_id).maybeSingle()
    : await supabase.from("ai_agents").select("*").eq("clinic_id", clinicId).eq("name", "Deby AI").eq("active", true).maybeSingle();

  const { data: history } = await supabase
    .from("whatsapp_mensagens")
    .select("direcao, tipo, texto, enviada_em")
    .eq("clinica_id", clinicId)
    .eq("conversa_id", conversaId)
    .order("enviada_em", { ascending: false })
    .limit(10);

  const transcript = (history ?? [])
    .reverse()
    .map((m: any) => `${m.direcao === "in" ? "Paciente/Contato" : "Clinica"}: ${m.texto ?? `[${m.tipo ?? "mensagem"}]`}`)
    .join("\n");

  const output = await callDebyForWhatsApp({
    clinicId,
    contatoNome,
    transcript,
    systemPrompt: agent?.system_prompt,
    model: agent?.model,
  });

  if (!output) {
    console.error("[deby-auto] IA nao gerou resposta para conversa", conversaId);
    return;
  }

  // Salva a resposta no banco antes de tentar enviar — garante que nao se perca
  await supabase
    .from("ai_conversation_settings")
    .update({ suggested_response: output, suggested_at: new Date().toISOString() })
    .eq("clinic_id", clinicId)
    .eq("conversation_id", conversaId);

  if (settings.ai_mode === "assisted") return;

  const nowIso = new Date().toISOString();
  const sent = await sendEvolutionText(evolutionUrl, evolutionKey, instanceName, telefone, output);
  if (!sent) {
    console.error("[deby-auto] Evolution nao enviou a mensagem para", telefone);
    return;
  }
  const messageId = extractEvolutionMessageId(sent);

  const { error: insertError } = await supabase.from("whatsapp_mensagens").insert({
    clinica_id: clinicId,
    conversa_id: conversaId,
    contato_id: contatoId,
    waha_message_id: messageId,
    direcao: "out",
    tipo: "text",
    texto: output,
    media_url: null,
    payload: { deby_auto: true, evolution: sent },
    enviada_em: nowIso,
  });

  if (insertError) {
    console.error("[deby-auto] insert resposta:", insertError.message);
  }

  await supabase
    .from("whatsapp_conversas")
    .update({ ultimo_texto: output, ultima_mensagem_em: nowIso })
    .eq("clinica_id", clinicId)
    .eq("id", conversaId);
}

async function callDebyForWhatsApp(input: {
  clinicId: string;
  contatoNome: string;
  transcript: string;
  systemPrompt?: string | null;
  model?: string | null;
}) {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    console.error("[deby-auto] OPENROUTER_API_KEY ausente.");
    return null;
  }

  const baseUrl = (Deno.env.get("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const model = input.model || Deno.env.get("DEFAULT_AI_MODEL") || "meta-llama/llama-3.3-70b-instruct:free";
  const systemPrompt = input.systemPrompt?.trim()
    || "Voce e Deby AI, assistente de atendimento de uma clinica. Responda em portugues do Brasil, com tom humano, claro e objetivo. Nao diagnostique, nao prometa resultados e direcione assuntos clinicos para avaliacao profissional.";

  console.log("[deby-auto] chamando OpenRouter model:", model);

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get("APP_ORIGIN") ?? "",
        "X-Title": "ClinicPro Deby AI WhatsApp"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `${systemPrompt}\n\nRegras: responda apenas a ultima mensagem do contato, em uma mensagem curta de WhatsApp. Se faltar informacao, faca uma pergunta objetiva. Nunca informe que voce e uma IA se nao perguntarem.`
          },
          {
            role: "user",
            content: `Contato: ${input.contatoNome}\nClinica: ${input.clinicId}\nConversa recente:\n${input.transcript.slice(0, 8000)}`
          }
        ],
        temperature: 0.35
      }),
      signal: controller.signal,
    });
    clearTimeout(tid);

    if (!response.ok) {
      const detail = await response.text();
      console.error("[deby-auto] OpenRouter erro", response.status, "model:", model, "detalhe:", detail.slice(0, 400));
      return null;
    }

    const data = await response.json();
    const output = String(data?.choices?.[0]?.message?.content ?? "").trim() || null;
    console.log("[deby-auto] OpenRouter resposta:", output ? `${output.slice(0, 80)}...` : "VAZIO");
    return output;
  } catch (err) {
    console.error("[deby-auto] fetch OpenRouter excecao:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function sendEvolutionText(
  evolutionUrl: string,
  evolutionKey: string,
  instanceName: string,
  telefone: string,
  text: string
) {
  const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": evolutionKey },
    body: JSON.stringify({ number: telefone.replace(/\D/g, ""), text }),
  });
  const raw = await response.text();
  let data: unknown = raw;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) {
    console.error("[deby-auto] Evolution sendText:", response.status, raw.slice(0, 400));
    return null;
  }
  return data;
}

function extractEvolutionMessageId(data: any): string | null {
  return data?.key?.id
    ?? data?.message?.key?.id
    ?? data?.data?.key?.id
    ?? data?.id
    ?? null;
}
