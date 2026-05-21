import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { assertStaff, getFunctionContext } from "../_shared/auth.ts";
import { evolutionRequest, extractInstanceApiKey, getMessageId } from "../_shared/evolution.ts";

interface Payload {
  clinicId: string;
  instanceId: string;
  conversationId: string;
  contactId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "document";
  mimeType?: string;
  fileName?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido." }, 405);

  try {
    const payload = await req.json() as Payload;
    if (!payload.clinicId || !payload.instanceId || !payload.conversationId || !payload.contactId) {
      return json({ error: "Dados obrigatorios invalidos." }, 400);
    }
    if (!payload.text?.trim() && !payload.mediaUrl) {
      return json({ error: "Mensagem vazia." }, 400);
    }

    const context = await getFunctionContext(req, payload.clinicId);
    assertStaff(context.role);

    const { data: instance, error: instanceError } = await context.supabaseAdmin
      .from("whatsapp_instances")
      .select("id, instance_name, raw_payload")
      .eq("id", payload.instanceId)
      .eq("clinic_id", payload.clinicId)
      .single();
    if (instanceError) throw instanceError;

    const { data: contact, error: contactError } = await context.supabaseAdmin
      .from("whatsapp_contacts")
      .select("id, phone")
      .eq("id", payload.contactId)
      .eq("clinic_id", payload.clinicId)
      .single();
    if (contactError) throw contactError;

    const endpoint = payload.mediaUrl ? "sendMedia" : "sendText";
    const body = payload.mediaUrl
      ? {
          number: contact.phone,
          mediatype: payload.mediaType ?? "document",
          mimetype: payload.mimeType ?? "application/octet-stream",
          caption: payload.text ?? "",
          media: payload.mediaUrl,
          fileName: payload.fileName ?? "arquivo",
          delay: 800
        }
      : {
          number: contact.phone,
          text: payload.text?.trim(),
          delay: 800,
          linkPreview: true
        };

    const result = await evolutionRequest<Record<string, any>>(
      `/message/${endpoint}/${encodeURIComponent(instance.instance_name)}`,
      { method: "POST", body: JSON.stringify(body) },
      extractInstanceApiKey(instance.raw_payload) ?? undefined
    );

    const now = new Date().toISOString();
    const messageType = payload.mediaUrl ? payload.mediaType ?? "document" : "text";
    const content = payload.text?.trim() || (payload.fileName ? `Arquivo: ${payload.fileName}` : null);
    const evolutionMessageId = getMessageId(result as Record<string, any>);

    await context.supabaseAdmin.from("whatsapp_messages").insert({
      clinic_id: payload.clinicId,
      instance_id: payload.instanceId,
      conversation_id: payload.conversationId,
      evolution_message_id: evolutionMessageId,
      direction: "out",
      message_type: messageType,
      content,
      media_url: payload.mediaUrl ?? null,
      raw_payload: result,
      status: result?.status ?? "sent",
      sent_at: now
    });

    await context.supabaseAdmin
      .from("whatsapp_conversations")
      .update({
        last_message: content,
        last_message_at: now,
        status: "pending"
      })
      .eq("id", payload.conversationId)
      .eq("clinic_id", payload.clinicId);

    return json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[evolution-send-message] erro interno:", error);
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
