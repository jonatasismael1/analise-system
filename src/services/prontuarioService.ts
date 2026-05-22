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

type ProntuarioAction = "acesso" | "salvar";

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

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function logProntuarioAccess(
  clinicId: string,
  prontuarioId: string,
  acao: ProntuarioAction
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const { error } = await supabase.from("prontuario_acessos").insert({
      clinica_id: clinicId,
      prontuario_id: prontuarioId,
      user_id: userId,
      acao
    });

    if (error) {
      console.warn("Nao foi possivel registrar acesso ao prontuario.", error);
    }
  } catch (error) {
    console.warn("Nao foi possivel registrar acesso ao prontuario.", error);
  }
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
  void Promise.all(records.map((record) => logProntuarioAccess(clinicId, record.id!, "acesso")));
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
  await logProntuarioAccess(clinicId, record.id!, "salvar");
  return record;
}
