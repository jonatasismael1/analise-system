import { supabase } from "../lib/supabaseClient";

export interface TeleconsultaData {
  id: string;
  appointmentId: string;
  wherebyRoomUrl: string | null;
  wherebyHostRoomUrl: string | null;
  status: string;
  consentStatus: string;
  patientAccessToken: string;
  patientAccessUrl: string | null;
  tokenExpiresAt: string | null;
  linkSentAt: string | null;
  errorMessage: string | null;
}

export interface TeleconsultaCreateResult {
  meetingId: string;
  roomUrl: string;
  hostRoomUrl: string | null;
  patientAccessToken: string;
  patientAccessUrl: string;
  tokenExpiresAt: string;
}

export async function getTeleconsultaByAppointment(appointmentId: string): Promise<TeleconsultaData | null> {
  const { data, error } = await supabase
    .from("teleconsultations")
    .select("*")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    appointmentId: data.appointment_id,
    wherebyRoomUrl: data.whereby_room_url,
    wherebyHostRoomUrl: data.whereby_host_room_url,
    status: data.status,
    consentStatus: data.consent_status,
    patientAccessToken: data.patient_access_token,
    patientAccessUrl: data.patient_access_url,
    tokenExpiresAt: data.token_expires_at,
    linkSentAt: data.link_sent_at,
    errorMessage: data.error_message,
  };
}

export async function createTeleconsultaRoom(params: {
  clinicId: string;
  appointmentId: string;
  patientId?: string | null;
  professionalId?: string | null;
  startTime: string;
  endTime: string;
}): Promise<TeleconsultaCreateResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, "");

  const resp = await fetch(`${supabaseUrl}/functions/v1/create-whereby-meeting`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`
    },
    body: JSON.stringify(params)
  });

  const result = await resp.json();
  if (!resp.ok) throw new Error(result.error ?? "Erro ao criar sala de teleconsulta");
  return result as TeleconsultaCreateResult;
}

export async function markLinkSent(teleconsultaId: string) {
  await supabase.from("teleconsultations").update({
    link_sent_at: new Date().toISOString(),
    status: "link_enviado",
    updated_at: new Date().toISOString()
  }).eq("id", teleconsultaId);
}

export async function recordProfessionalJoined(teleconsultaId: string) {
  await supabase.from("teleconsultations").update({
    professional_joined_at: new Date().toISOString(),
    status: "em_atendimento",
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", teleconsultaId);
}

export function buildTeleconsultaMessage(params: {
  patientName: string;
  professionalName: string;
  date: string;
  time: string;
  accessUrl: string;
}): string {
  const dateBR = new Date(`${params.date}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric"
  });
  return (
    `Olá, ${params.patientName}. Sua teleconsulta com ${params.professionalName} está agendada para ${dateBR} às ${params.time.slice(0, 5)}.\n\n` +
    `Antes do atendimento, acesse o link abaixo para confirmar o consentimento e entrar na consulta:\n${params.accessUrl}\n\n` +
    `Recomendamos entrar 5 minutos antes, em um local reservado e com boa conexão.`
  );
}

export const TELECONSULTA_STATUS_LABEL: Record<string, string> = {
  agendada: "Agendada",
  sala_criada: "Sala criada",
  link_enviado: "Link enviado",
  consentimento_pendente: "Consentimento pendente",
  consentimento_aceito: "Consentimento aceito",
  aguardando_paciente: "Aguardando paciente",
  em_atendimento: "Em atendimento",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
  erro_sala: "Erro na sala",
};
