import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeadersForRequest, json } from "../_shared/http.ts";
import { env, getFunctionContext, HttpError } from "../_shared/auth.ts";

interface Payload {
  clinicId: string;
  appointmentId: string;
  patientId?: string | null;
  professionalId?: string | null;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601 — obrigatório pelo Whereby
}

Deno.serve(async (req) => {
  const responseHeaders = corsHeadersForRequest(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405, responseHeaders);

  try {
    const payload = await req.json() as Payload;
    if (!payload.clinicId || !payload.appointmentId || !payload.endTime) {
      return json({ error: "Dados obrigatórios inválidos." }, 400, responseHeaders);
    }

    const context = await getFunctionContext(req, payload.clinicId);
    if (!["admin", "profissional"].includes(context.role)) {
      return json({ error: "Acesso negado. Apenas admin e profissional podem criar salas." }, 403, responseHeaders);
    }

    const apiKey = env("WHEREBY_API_KEY");
    const baseUrl = (Deno.env.get("WHEREBY_BASE_URL") ?? "https://api.whereby.dev/v1").replace(/\/$/, "");
    const roomNamePrefix = Deno.env.get("WHEREBY_ROOM_NAME_PREFIX") ?? "deby-saude";
    const appBaseUrl = (Deno.env.get("APP_BASE_URL") ?? "https://analise-system.netlify.app").replace(/\/$/, "");

    // Cria sala no Whereby
    const wherebyResp = await fetch(`${baseUrl}/meetings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        endDate: payload.endTime,
        isLocked: true,
        roomMode: "normal",
        roomNamePrefix,
        fields: ["hostRoomUrl"]
      })
    });

    if (!wherebyResp.ok) {
      const detail = await wherebyResp.text();
      // Salva log de erro no banco
      await context.supabaseAdmin.from("teleconsultations").upsert({
        clinica_id: payload.clinicId,
        appointment_id: payload.appointmentId,
        patient_id: payload.patientId ?? null,
        professional_id: payload.professionalId ?? null,
        status: "erro_sala",
        error_message: detail.slice(0, 500),
        provider: "whereby",
        updated_at: new Date().toISOString()
      }, { onConflict: "appointment_id" });

      return json({ error: "Falha ao criar sala no Whereby.", detail: detail.slice(0, 300) }, 502, responseHeaders);
    }

    const meeting = await wherebyResp.json();
    const patientAccessToken = crypto.randomUUID();
    const patientAccessUrl = `${appBaseUrl}/teleconsulta/${patientAccessToken}`;
    // Token válido por 30 dias (pode ser regenerado)
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: dbError } = await context.supabaseAdmin.from("teleconsultations").upsert({
      clinica_id: payload.clinicId,
      appointment_id: payload.appointmentId,
      patient_id: payload.patientId ?? null,
      professional_id: payload.professionalId ?? null,
      whereby_meeting_id: meeting.meetingId,
      whereby_room_url: meeting.roomUrl,
      whereby_host_room_url: meeting.hostRoomUrl ?? null,
      provider: "whereby",
      status: "sala_criada",
      patient_access_token: patientAccessToken,
      patient_access_url: patientAccessUrl,
      token_expires_at: tokenExpiresAt,
      consent_status: "pendente",
      error_message: null,
      updated_at: new Date().toISOString()
    }, { onConflict: "appointment_id" });

    if (dbError) throw new Error(dbError.message);

    return json({
      meetingId: meeting.meetingId,
      roomUrl: meeting.roomUrl,
      hostRoomUrl: meeting.hostRoomUrl ?? null,
      patientAccessToken,
      patientAccessUrl,
      tokenExpiresAt
    }, 200, responseHeaders);

  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, error.statusCode, responseHeaders);
    }
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500, responseHeaders);
  }
});
