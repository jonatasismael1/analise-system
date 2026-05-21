const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Use POST." }, 405);
  }

  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return jsonResponse({
      ok: false,
      error: "Secrets ausentes no Supabase.",
      missing: { EVOLUTION_API_URL: !EVOLUTION_API_URL, EVOLUTION_API_KEY: !EVOLUTION_API_KEY }
    }, 500);
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Body inválido." }, 400);
  }

  const { action, instanceName } = body;
  if (!action) {
    return jsonResponse({ ok: false, error: "Campo action é obrigatório." }, 400);
  }

  const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");

  async function callEvolution(path: string, method: string, payload?: unknown) {
    const url = `${baseUrl}${path}`;
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("apikey", EVOLUTION_API_KEY as string);
    const options: RequestInit = { method, headers };
    if (payload !== undefined) options.body = JSON.stringify(payload);
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      let data: unknown = text;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      return { ok: response.ok, status: response.status, url, data };
    } catch (err) {
      return { ok: false, status: 500, url, error: err instanceof Error ? err.message : String(err) };
    }
  }

  try {
    let result;

    switch (action) {
      case "fetch_instances":
        result = await callEvolution("/instance/fetchInstances", "GET");
        break;

      case "create_instance":
        if (!instanceName) return jsonResponse({ ok: false, error: "instanceName obrigatório." }, 400);
        result = await callEvolution("/instance/create", "POST", {
          instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS",
        });
        break;

      case "connect_instance":
        if (!instanceName) return jsonResponse({ ok: false, error: "instanceName obrigatório." }, 400);
        result = await callEvolution(`/instance/connect/${instanceName}`, "GET");
        break;

      case "get_status":
        if (!instanceName) return jsonResponse({ ok: false, error: "instanceName obrigatório." }, 400);
        result = await callEvolution(`/instance/connectionState/${instanceName}`, "GET");
        break;

      case "logout_instance":
        if (!instanceName) return jsonResponse({ ok: false, error: "instanceName obrigatório." }, 400);
        result = await callEvolution(`/instance/logout/${instanceName}`, "DELETE");
        break;

      case "delete_instance":
        if (!instanceName) return jsonResponse({ ok: false, error: "instanceName obrigatório." }, 400);
        result = await callEvolution(`/instance/delete/${instanceName}`, "DELETE");
        break;

      case "set_webhook": {
        if (!instanceName) return jsonResponse({ ok: false, error: "instanceName obrigatório." }, 400);
        const { webhookUrl } = body;
        if (!webhookUrl) return jsonResponse({ ok: false, error: "webhookUrl obrigatório." }, 400);
        result = await callEvolution(`/webhook/set/${instanceName}`, "POST", {
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: true,
            webhookBase64: false,
            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "CONTACTS_UPSERT", "CHATS_UPSERT"],
          },
        });
        break;
      }

      case "send_text": {
        if (!instanceName) return jsonResponse({ ok: false, error: "instanceName obrigatório." }, 400);
        const { number, text } = body;
        if (!number || !text) return jsonResponse({ ok: false, error: "number e text obrigatórios." }, 400);
        result = await callEvolution(`/message/sendText/${instanceName}`, "POST", { number, text });
        break;
      }

      case "send_media": {
        if (!instanceName) return jsonResponse({ ok: false, error: "instanceName obrigatório." }, 400);
        const { number: num, mediaUrl, mediaType, caption, fileName, mimeType } = body;
        if (!num || !mediaUrl) return jsonResponse({ ok: false, error: "number e mediaUrl obrigatórios." }, 400);
        if (mediaType === "audio") {
          result = await callEvolution(`/message/sendWhatsAppAudio/${instanceName}`, "POST", {
            number: num,
            audio: mediaUrl,
          });
        } else {
          result = await callEvolution(`/message/sendMedia/${instanceName}`, "POST", {
            number: num,
            mediatype: mediaType ?? "document",
            media: mediaUrl,
            caption: caption ?? "",
            fileName: fileName ?? "",
            mimetype: mimeType ?? "application/octet-stream",
          });
        }
        break;
      }

      default:
        return jsonResponse({
          ok: false,
          error: `Action inválida: ${action}`,
          allowedActions: ["fetch_instances","create_instance","connect_instance","get_status","logout_instance","delete_instance","set_webhook","send_text","send_media"]
        }, 400);
    }

    return jsonResponse(result, 200);
  } catch (err) {
    return jsonResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
