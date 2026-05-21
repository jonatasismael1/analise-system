export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waha-signature, x-webhook-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

export function corsHeadersForRequest(req: Request) {
  const origin = req.headers.get("origin");
  const configured = [
    Deno.env.get("APP_ORIGIN"),
    Deno.env.get("NEXT_PUBLIC_APP_URL"),
    Deno.env.get("ALLOWED_APP_ORIGINS")
  ].filter(Boolean).flatMap((value) => String(value).split(",").map((item) => item.trim()).filter(Boolean));

  if (!configured.length) return corsHeaders;
  const allowedOrigin = origin && configured.includes(origin) ? origin : configured[0];
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": allowedOrigin,
    "Vary": "Origin"
  };
}

export function json(body: unknown, status = 200, headers = corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json"
    }
  });
}
