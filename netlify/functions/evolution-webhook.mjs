/* global process, Response, URL, fetch */

export default async function handler(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    return new Response(JSON.stringify({ error: "SUPABASE_URL ausente." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/evolution-webhook`);
  sourceUrl.searchParams.forEach((value, key) => targetUrl.searchParams.set(key, value));

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();

  return fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body
  });
}

export const config = {
  path: "/api/webhooks/evolution"
};
