import { supabase } from "../lib/supabaseClient";
import type { ProntuarioData } from "../components/Prontuario/ProntuarioEditor";

interface ProntuarioRow {
  id: string;
  profissional_id: string | null;
  queixa: string | null;
  evolucao: string | null;
  conduta: string | null;
  imagens: string[] | null;
  criado_em: string;
  atualizado_em: string;
}

function mapProntuarioRow(row: ProntuarioRow): ProntuarioData {
  return {
    id: row.id,
    queixa: row.queixa ?? "",
    evolucao: row.evolucao ?? "",
    conduta: row.conduta ?? "",
    profissionalId: row.profissional_id ?? "",
    data: row.criado_em,
    atualizadoEm: row.atualizado_em,
    imagens: row.imagens ?? [],
  };
}

export interface ProntuarioAccessLogEntry {
  id: string;
  clinica_id: string;
  paciente_id: string;
  acessado_por: string;
  acessado_por_nome: string;
  role: string;
  created_at: string;
}

/**
 * Registra o acesso a um prontuário para fins de conformidade com a LGPD.
 * Fire-and-forget: erros são silenciados para não impactar a UI.
 */
export async function logProntuarioAccess(params: {
  clinicaId: string;
  pacienteId: string;
  acessadoPor: string;      // user_id (UUID do auth)
  acessadoPorNome: string;  // nome exibido do usuário
  role: string;
}): Promise<void> {
  try {
    await supabase.from("prontuario_access_logs").insert({
      clinica_id: params.clinicaId,
      paciente_id: params.pacienteId,
      acessado_por: params.acessadoPor,
      acessado_por_nome: params.acessadoPorNome,
      role: params.role,
    });
    // Erros são ignorados silenciosamente — o log nunca deve quebrar a UI
  } catch {
    // Silencioso intencional
  }
}

/**
 * Busca os últimos N acessos ao prontuário de um paciente (para admins).
 */
export async function fetchProntuarioAccessLogs(
  clinicaId: string,
  pacienteId: string,
  limit = 10
): Promise<ProntuarioAccessLogEntry[]> {
  const { data } = await supabase
    .from("prontuario_access_logs")
    .select("*")
    .eq("clinica_id", clinicaId)
    .eq("paciente_id", pacienteId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ProntuarioAccessLogEntry[];
}

export async function loadProntuarios(clinicId: string, patientId: string): Promise<ProntuarioData[]> {
  const { data, error } = await supabase
    .from("prontuarios")
    .select("id, profissional_id, queixa, evolucao, conduta, imagens, criado_em, atualizado_em")
    .eq("clinica_id", clinicId)
    .eq("paciente_id", patientId)
    .order("criado_em", { ascending: false });

  if (error) {
    throw error;
  }

  const records = ((data ?? []) as ProntuarioRow[]).map(mapProntuarioRow);
  return records;
}

export async function saveProntuario(
  clinicId: string,
  patientId: string,
  values: ProntuarioData
): Promise<ProntuarioData> {
  const now = new Date().toISOString();
  const payload = {
    clinica_id: clinicId,
    paciente_id: patientId,
    profissional_id: values.profissionalId || null,
    queixa: values.queixa || null,
    evolucao: values.evolucao || null,
    conduta: values.conduta || null,
    imagens: values.imagens ?? [],
    atualizado_em: now
  };

  const query = values.id
    ? supabase
        .from("prontuarios")
        .update(payload)
        .eq("id", values.id)
        .eq("clinica_id", clinicId)
        .eq("paciente_id", patientId)
        .select("id, profissional_id, queixa, evolucao, conduta, imagens, criado_em, atualizado_em")
        .single()
    : supabase
        .from("prontuarios")
        .insert(payload)
        .select("id, profissional_id, queixa, evolucao, conduta, imagens, criado_em, atualizado_em")
        .single();

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const record = mapProntuarioRow(data as ProntuarioRow);
  return record;
}
