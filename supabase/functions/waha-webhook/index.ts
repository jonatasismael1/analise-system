import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/http.ts";
import { env } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido." }, 405);

  const expectedSecret = Deno.env.get("WAHA_WEBHOOK_SECRET");
  if (expectedSecret) {
    const receivedSecret = req.headers.get("x-webhook-secret") ?? req.headers.get("x-waha-signature");
    if (receivedSecret !== expectedSecret) return json({ error: "Webhook nao autorizado." }, 401);
  }

  try {
    const url = new URL(req.url);
    const clinicId = url.searchParams.get("clinicId") ?? "";
    if (!clinicId) return json({ error: "clinicId ausente." }, 400);

    const payload = await req.json();
    const message = payload?.payload ?? payload;
    const chatId = message?.from ?? message?.chatId ?? message?.to ?? "";
    const text = message?.body ?? message?.text ?? message?.message?.text ?? "";
    const contactName = message?.pushName ?? message?.notifyName ?? message?.fromName ?? null;
    const messageId = message?.id ?? message?._data?.id?.id ?? null;
    const fromMe = Boolean(message?.fromMe);

    if (!chatId || !text || fromMe) return json({ ok: true, skipped: true });

    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const phone = String(chatId).replace("@c.us", "").replace(/\D/g, "");
    const { data: contact, error: contactError } = await supabase
      .from("whatsapp_contatos")
      .upsert({
        clinica_id: clinicId,
        chat_id: chatId,
        telefone: phone,
        nome: contactName
      }, { onConflict: "clinica_id,chat_id" })
      .select("id")
      .single();
    if (contactError) throw contactError;

    const { data: conversation, error: conversationError } = await supabase
      .from("whatsapp_conversas")
      .upsert({
        clinica_id: clinicId,
        contato_id: contact.id,
        chat_id: chatId,
        ultimo_texto: text,
        ultima_mensagem_em: new Date().toISOString(),
        status: "aberta"
      }, { onConflict: "clinica_id,chat_id" })
      .select("id")
      .single();
    if (conversationError) throw conversationError;

    await supabase.from("whatsapp_mensagens").insert({
      clinica_id: clinicId,
      conversa_id: conversation.id,
      contato_id: contact.id,
      waha_message_id: messageId,
      direcao: "in",
      texto: text,
      payload,
      enviada_em: message?.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString()
    });

    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
