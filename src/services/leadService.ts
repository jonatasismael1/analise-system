import { supabase } from "../lib/supabaseClient";

export interface LeadStage {
  id: string;
  nome: string;
  chave: string;
  ordem: number;
  cor: string;
}

export interface Lead {
  id: string;
  clinicaId: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  origem: string;
  interesse: string | null;
  etapaId: string | null;
  pacienteId: string | null;
  conversaId: string | null;
  temperatura: "frio" | "morno" | "quente";
  objecoes: string | null;
  proximoPasso: string | null;
  resumo: string | null;
}

export async function ensureDefaultStages(clinicId: string) {
  await supabase.rpc("seed_default_kanban_stages", { target_clinica_id: clinicId });
}

export async function loadLeadStages(clinicId: string) {
  const { data, error } = await supabase
    .from("kanban_etapas")
    .select("*")
    .eq("clinica_id", clinicId)
    .eq("ativa", true)
    .order("ordem");
  if (error) throw error;
  return (data ?? []).map((row: any): LeadStage => ({
    id: row.id,
    nome: row.nome,
    chave: row.chave,
    ordem: row.ordem,
    cor: row.cor
  }));
}

export async function loadLeads(clinicId: string) {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("clinica_id", clinicId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLead);
}

export async function saveLead(clinicId: string, values: Partial<Lead> & { id?: string; nome: string }) {
  const payload = {
    clinica_id: clinicId,
    nome: values.nome,
    telefone: values.telefone ?? null,
    email: values.email ?? null,
    origem: values.origem ?? "manual",
    interesse: values.interesse ?? null,
    etapa_id: values.etapaId ?? null,
    paciente_id: values.pacienteId ?? null,
    conversa_id: values.conversaId ?? null,
    temperatura: values.temperatura ?? "morno",
    objecoes: values.objecoes ?? null,
    proximo_passo: values.proximoPasso ?? null,
    resumo: values.resumo ?? null
  };
  const result = values.id
    ? await supabase.from("leads").update(payload).eq("id", values.id).eq("clinica_id", clinicId)
    : await supabase.from("leads").insert(payload);
  if (result.error) throw result.error;
}

export async function moveLead(clinicId: string, lead: Lead, nextStageId: string) {
  const { error } = await supabase
    .from("leads")
    .update({ etapa_id: nextStageId })
    .eq("id", lead.id)
    .eq("clinica_id", clinicId);
  if (error) throw error;

  await supabase.from("lead_movimentos").insert({
    clinica_id: clinicId,
    lead_id: lead.id,
    etapa_origem_id: lead.etapaId,
    etapa_destino_id: nextStageId
  });
}

export async function createLeadFromConversation(input: {
  clinicId: string;
  conversationId: string;
  contactId: string;
  name: string;
  phone: string | null;
  stageId: string | null;
  summary?: string | null;
}) {
  const { data, error } = await supabase
    .from("leads")
    .insert({
      clinica_id: input.clinicId,
      nome: input.name,
      telefone: input.phone,
      origem: "whatsapp",
      conversa_id: input.conversationId,
      etapa_id: input.stageId,
      resumo: input.summary ?? null
    })
    .select("id")
    .single();
  if (error) throw error;

  await Promise.all([
    supabase.from("whatsapp_conversas").update({ lead_id: data.id }).eq("id", input.conversationId).eq("clinica_id", input.clinicId),
    supabase.from("whatsapp_contatos").update({ lead_id: data.id }).eq("id", input.contactId).eq("clinica_id", input.clinicId)
  ]);

  return data.id as string;
}

function mapLead(row: any): Lead {
  return {
    id: row.id,
    clinicaId: row.clinica_id,
    nome: row.nome,
    telefone: row.telefone,
    email: row.email,
    origem: row.origem,
    interesse: row.interesse,
    etapaId: row.etapa_id,
    pacienteId: row.paciente_id,
    conversaId: row.conversa_id,
    temperatura: row.temperatura,
    objecoes: row.objecoes,
    proximoPasso: row.proximo_passo,
    resumo: row.resumo
  };
}

