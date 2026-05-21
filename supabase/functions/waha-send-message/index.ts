import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { assertStaff, env, getFunctionContext } from "../_shared/auth.ts";

interface Payload {
  clinicId: string;
  conversaId: string;
  contatoId: string;
  chatId: string;
  text: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido." }, 405);

  try {
    const payload = await req.json() as Payload;
    if (!payload.clinicId || !payload.conversaId || !payload.contatoId || !payload.chatId || !payload.text?.trim()) {
      return json({ error: "Dados obrigatorios invalidos." }, 400);
    }

    const context = await getFunctionContext(req, payload.clinicId);
    assertStaff(context.role);

    const baseUrl = env("WAHA_BASE_URL").replace(/\/$/, "");
    // WAHA Core só suporta "default" — forçar independente do WAHA_SESSION
    const mode    = Deno.env.get("WAHA_MODE") ?? "core";
    const session = mode === "plus" ? (Deno.env.get("WAHA_SESSION") ?? "default") : "default";
    const apiKey  = env("WAHA_API_KEY");
    const response = await fetch(`${baseUrl}/api/sendText`, {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ session, chatId: payload.chatId, text: payload.text })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Log técnico interno — não expõe detalhe ao frontend
      console.error("[waha-send-message] erro WAHA:", response.status, data);
      return json({ error: "Não foi possível enviar a mensagem. Verifique se o WhatsApp está conectado." }, 502);
    }

    await context.supabaseAdmin.from("whatsapp_mensagens").insert({
      clinica_id: payload.clinicId,
      conversa_id: payload.conversaId,
      contato_id: payload.contatoId,
      waha_message_id: data?.id ?? data?._data?.id?.id ?? null,
      direcao: "out",
      texto: payload.text,
      payload: data,
      enviada_em: new Date().toISOString()
    });

    await context.supabaseAdmin.from("whatsapp_conversas").update({
      ultimo_texto: payload.text,
      ultima_mensagem_em: new Date().toISOString(),
      status: "aguardando"
    }).eq("id", payload.conversaId).eq("clinica_id", payload.clinicId);

    return json({ ok: true, data });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});

