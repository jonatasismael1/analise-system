import { supabase } from "../lib/supabaseClient";
import type { Appointment } from "../types/clinic";

export type RecurrenceFrequency = "none" | "weekly" | "biweekly" | "monthly";

export type AppointmentInput = {
  id?: string;
  profissionalId: string;
  servicoId?: string | null;
  pacienteId?: string | null;
  pacienteNome: string;
  pacienteWhatsapp: string;
  data: string;
  horario: string;
  status: Appointment["status"];
  tipoAtendimento?: "presencial" | "teleconsulta";
  recorrencia?: {
    frequency: RecurrenceFrequency;
    occurrences: number;
  };
};

function addMonthsClamped(date: Date, months: number) {
  const target = new Date(date);
  const originalDay = target.getDate();
  target.setDate(1);
  target.setMonth(target.getMonth() + months);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(originalDay, lastDay));
  return target;
}

function addByFrequency(date: Date, frequency: RecurrenceFrequency, index: number) {
  const next = new Date(date);
  if (frequency === "weekly") next.setDate(next.getDate() + index * 7);
  if (frequency === "biweekly") next.setDate(next.getDate() + index * 14);
  if (frequency === "monthly") return addMonthsClamped(date, index);
  return next;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildAppointmentPayload(clinicId: string, values: AppointmentInput, data = values.data, recorrenciaId?: string | null) {
  return {
    clinica_id: clinicId,
    profissional_id: values.profissionalId,
    servico_id: values.servicoId ?? null,
    paciente_id: values.pacienteId ?? null,
    paciente_nome: values.pacienteNome,
    paciente_whatsapp: values.pacienteWhatsapp,
    data,
    horario: values.horario,
    status: values.status,
    tipo_atendimento: values.tipoAtendimento ?? "presencial",
    recorrencia_id: recorrenciaId ?? null
  };
}

export function buildRecurringDates(startDate: string, frequency: RecurrenceFrequency, occurrences: number) {
  const start = new Date(`${startDate}T12:00:00`);
  return Array.from({ length: Math.max(1, occurrences) }, (_, index) => toISODate(addByFrequency(start, frequency, index)));
}

export function saveAppointmentRecord(clinicId: string, values: AppointmentInput) {
  if (values.id) {
    return supabase.from("agendamentos").update(buildAppointmentPayload(clinicId, values)).eq("id", values.id);
  }

  const recurrence = values.recorrencia;
  if (!recurrence || recurrence.frequency === "none" || recurrence.occurrences <= 1) {
    return supabase.from("agendamentos").insert(buildAppointmentPayload(clinicId, values));
  }

  const recorrenciaId = crypto.randomUUID();
  const rows = buildRecurringDates(values.data, recurrence.frequency, recurrence.occurrences)
    .map((date) => buildAppointmentPayload(clinicId, values, date, recorrenciaId));

  return supabase.from("agendamentos").insert(rows);
}

export function deleteAppointmentRecord(id: string) {
  return supabase.from("agendamentos").delete().eq("id", id);
}

export function deleteAppointmentSeriesRecord(recorrenciaId: string) {
  return supabase.from("agendamentos").delete().eq("recorrencia_id", recorrenciaId);
}
