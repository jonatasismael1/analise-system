import { supabase } from "../lib/supabaseClient";
import type { Appointment } from "../types/clinic";

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
};

export function saveAppointmentRecord(clinicId: string, values: AppointmentInput) {
  const payload = {
    clinica_id: clinicId,
    profissional_id: values.profissionalId,
    servico_id: values.servicoId ?? null,
    paciente_id: values.pacienteId ?? null,
    paciente_nome: values.pacienteNome,
    paciente_whatsapp: values.pacienteWhatsapp,
    data: values.data,
    horario: values.horario,
    status: values.status
  };

  return values.id ? supabase.from("agendamentos").update(payload).eq("id", values.id) : supabase.from("agendamentos").insert(payload);
}

export function deleteAppointmentRecord(id: string) {
  return supabase.from("agendamentos").delete().eq("id", id);
}
