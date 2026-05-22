import { supabase } from "../lib/supabaseClient";
import type { Patient } from "../types/clinic";

export function savePatientRecord(clinicId: string, values: Patient & { id?: string }) {
  const payload = {
    clinica_id: clinicId,
    nome: values.nome,
    whatsapp: values.whatsapp,
    email: values.email ?? null,
    cpf: values.cpf ?? null,
    data_nascimento: values.dataNascimento ?? null,
    endereco: values.endereco ?? null,
    status: values.status,
    profissional_id: values.profissionalId ?? null,
    ultimo_atendimento: values.ultimoAtendimento ?? null,
    proximo_retorno: values.proximoRetorno ?? null,
    kanban_stage: values.kanbanStage ?? null,
    valor_total_gasto: values.valorTotalGasto,
    observacoes: values.observacoes ?? null,
    foto_url: values.fotoUrl ?? null,
  };

  return values.id ? supabase.from("pacientes").update(payload).eq("id", values.id) : supabase.from("pacientes").insert(payload);
}

export function deletePatientRecord(id: string) {
  return supabase.from("pacientes").delete().eq("id", id);
}

export async function importPatientRecords(clinicId: string, patients: Omit<Patient, "id" | "clinicaId">[]) {
  for (let i = 0; i < patients.length; i += 100) {
    const batch = patients.slice(i, i + 100).map((patient) => ({
      clinica_id: clinicId,
      nome: patient.nome,
      whatsapp: patient.whatsapp,
      email: patient.email ?? null,
      cpf: patient.cpf ?? null,
      data_nascimento: patient.dataNascimento ?? null,
      endereco: patient.endereco ?? null,
      status: patient.status,
      profissional_id: patient.profissionalId ?? null,
      kanban_stage: patient.kanbanStage ?? null,
      valor_total_gasto: patient.valorTotalGasto,
      observacoes: patient.observacoes ?? null
    }));
    const { error } = await supabase.from("pacientes").insert(batch);
    if (error) return { error, failedBatchStart: i };
  }
  return { error: null, failedBatchStart: null };
}
