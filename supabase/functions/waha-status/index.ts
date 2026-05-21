import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { assertStaff, env, getFunctionContext } from "../_shared/auth.ts";

// Mapeamento de estados do WAHA para estados do frontend
const WAHA_CONNECTED = ["WORKING", "CONNECTED"];
const WAHA_QR       = ["SCAN_QR_CODE"];
const WAHA_STARTING = ["STARTING", "OPENING"];
const WAHA_FAILED   = ["FAILED"];

// WAHA_MODE=core → sempre usa "default" (WAHA Core só suporta uma sessão)
// WAHA_MODE=plus  → usa WAHA_SESSION do env (multi-conta disponível)
function getSessionName(): string {
  const mode = Deno.env.get("WAHA_MODE") ?? "core";
  if (mode === "plus") return Deno.env.get("WAHA_SESSION") ?? "default";
  return "default";
}

async function wahaGetStatus(baseUrl: string, session: string, apiKey: string) {
  const resp = await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(session)}`, {
    headers: { "X-Api-Key": apiKey, Accept: "application/json" }
  });
  if (resp.status === 404) return null;
  if (!resp.ok) return null;
  return resp.json().catch(() => ({}));
}

async function wahaGetQr(baseUrl: string, session: string, apiKey: string): Promise<string | null> {
  const resp = await fetch(`${baseUrl}/api/${encodeURIComponent(session)}/auth/qr`, {
    headers: { "X-Api-Key": apiKey, Accept: "application/json" }
  });
  if (!resp.ok) return null;
  const data = await resp.json().catch(() => ({}));
  // Formato WAHA: { mimetype: "image/png", data: "<base64>" }
  if (data?.mimetype && data?.data) {
    return `data:${data.mimetype};base64,${data.data}`;
  }
  // Fallback: campo value com QR raw
  return data?.value ?? null;
}

function mapWahaStatus(wahaStatus: string): string {
  if (WAHA_CONNECTED.includes(wahaStatus)) return "connected";
  if (WAHA_QR.includes(wahaStatus))        return "qr_required";
  if (WAHA_STARTING.includes(wahaStatus))  return "starting";
  if (WAHA_FAILED.includes(wahaStatus))    return "failed";
  return "disconnected";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido." }, 405);

  try {
    const body = await req.json();
    const { clinicId, action = "status" } = body;
    const context = await getFunctionContext(req, clinicId);
    assertStaff(context.role);

    const baseUrl  = env("WAHA_BASE_URL").replace(/\/$/, "");
    const session  = getSessionName();
    const apiKey   = env("WAHA_API_KEY");
    const headers  = { "X-Api-Key": apiKey, Accept: "application/json", "Content-Type": "application/json" };

    // ── connect ──────────────────────────────────────────────────────────────
    // Máquina de estados completa: cria / inicia / reinicia conforme necessário
    // e devolve o estado atual ao frontend.
    if (action === "connect") {
      let sessionData = await wahaGetStatus(baseUrl, session, apiKey);

      // Sessão não existe → criar
      if (!sessionData) {
        const createResp = await fetch(`${baseUrl}/api/sessions`, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: session })
        });
        // 422 = sessão já existe mas não apareceu no GET (race condition) — ignorar
        if (!createResp.ok && createResp.status !== 422) {
          return json({ ok: false, status: "failed", message: "Não foi possível criar a sessão WhatsApp." });
        }
        sessionData = await wahaGetStatus(baseUrl, session, apiKey);
      }

      const wahaStatus: string = sessionData?.status ?? sessionData?.state ?? "";

      if (WAHA_CONNECTED.includes(wahaStatus)) {
        return json({ ok: true, status: "connected", session });
      }

      if (WAHA_QR.includes(wahaStatus)) {
        const qr = await wahaGetQr(baseUrl, session, apiKey);
        return json({ ok: true, status: "qr_required", qr, session });
      }

      if (WAHA_STARTING.includes(wahaStatus)) {
        return json({ ok: true, status: "starting", session });
      }

      if (WAHA_FAILED.includes(wahaStatus)) {
        // Sessão falhou → reiniciar
        await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(session)}/restart`, {
          method: "POST",
          headers
        });
        return json({ ok: true, status: "starting", session });
      }

      // STOPPED ou estado desconhecido → iniciar
      await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(session)}/start`, {
        method: "POST",
        headers
      });
      return json({ ok: true, status: "starting", session });
    }

    // ── status ────────────────────────────────────────────────────────────────
    // Retorna estado normalizado (connected / qr_required / starting / failed / disconnected)
    if (action === "status") {
      const sessionData = await wahaGetStatus(baseUrl, session, apiKey);
      if (!sessionData) {
        return json({ ok: true, status: "disconnected", session });
      }
      const wahaStatus: string = sessionData?.status ?? sessionData?.state ?? "";
      return json({ ok: true, status: mapWahaStatus(wahaStatus), session });
    }

    // ── qr ────────────────────────────────────────────────────────────────────
    // Busca o QR Code atual (chamado pelo polling do frontend)
    if (action === "qr") {
      const qr = await wahaGetQr(baseUrl, session, apiKey);
      return json({ ok: Boolean(qr), qr });
    }

    // ── disconnect ────────────────────────────────────────────────────────────
    // Para a sessão (mantém arquivo no disco — não precisa de novo QR se o volume estiver configurado)
    if (action === "disconnect") {
      const resp = await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(session)}/stop`, {
        method: "POST",
        headers
      });
      // Fallback: alguns builds usam DELETE
      if (!resp.ok) {
        await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(session)}`, {
          method: "DELETE",
          headers
        });
      }
      return json({ ok: true, status: "disconnected", session });
    }

    return json({ error: "Acao desconhecida." }, 400);

  } catch (error) {
    if (error instanceof Response) return error;
    // Nunca expor mensagens técnicas do WAHA ao frontend
    console.error("[waha-status] erro interno:", error);
    return json({ error: "Não foi possível conectar ao WhatsApp. Tente novamente." }, 500);
  }
});
