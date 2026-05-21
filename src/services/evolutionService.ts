import { supabase } from "../lib/supabaseClient";

export type EvolutionFrontendStatus = "connected" | "disconnected" | "qr_required" | "starting" | "error";
export type MessageType = "text" | "image" | "video" | "audio" | "document" | "unknown";
export type AiMode = "automatic" | "assisted";

export interface WhatsAppInstance {
  id: string;
  clinicId: string;
  instanceName: string;
  status: EvolutionFrontendStatus;
  phoneNumber: string | null;
  qrCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppContact {
  id: string;
  name: string | null;
  phone: string;
  profilePicUrl: string | null;
  pushName: string | null;
}

export type AtendimentoStatus = "novo" | "ativo" | "paciente" | "arquivado" | "humano";

export interface AiAgent {
  id: string;
  name: string;
  provider: string;
  model: string;
  systemPrompt: string;
  active: boolean;
}

export interface ConversationAiSettings {
  id: string;
  aiEnabled: boolean;
  agentId: string | null;
  humanTakeover: boolean;
  aiMode: AiMode;
  suggestedResponse: string | null;
  suggestedAt: string | null;
}

export interface WhatsAppConversation {
  id: string;
  instanceId: string;
  contactId: string;
  leadId: string | null;
  status: string;
  atendimentoStatus: AtendimentoStatus;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  contact: WhatsAppContact;
  aiSettings: ConversationAiSettings | null;
}

export interface WhatsAppMessage {
  id: string;
  direction: "in" | "out";
  messageType: MessageType;
  content: string | null;
  mediaUrl: string | null;
  status: string | null;
  sentAt: string;
}

export async function listEvolutionInstances(clinicId: string) {
  const { data, error } = await supabase.functions.invoke("evolution-instance", {
    body: { clinicId, action: "list" }
  });
  if (error) throw new Error("Nao foi possivel listar instancias.");
  if (data?.error) throw new Error(data.error);
  return (data?.instances ?? []).map(mapInstance) as WhatsAppInstance[];
}

export async function createEvolutionInstance(clinicId: string, instanceName: string) {
  const { data, error } = await supabase.functions.invoke("evolution-instance", {
    body: { clinicId, action: "create", instanceName }
  });
  if (error) throw new Error("Nao foi possivel criar a instancia.");
  if (data?.error) throw new Error(data.error);
  return mapInstance(data.instance);
}

export async function connectEvolutionInstance(clinicId: string, instanceId: string) {
  const { data, error } = await supabase.functions.invoke("evolution-instance", {
    body: { clinicId, action: "connect", instanceId }
  });
  if (error) throw new Error("Nao foi possivel gerar o QR Code.");
  if (data?.error) throw new Error(data.error);
  return data as { ok: boolean; status: EvolutionFrontendStatus; qr?: string | null };
}

export async function connectWhatsApp(clinicId: string) {
  const { data, error } = await supabase.functions.invoke("evolution-instance", {
    body: { clinicId, action: "connect_or_create" }
  });
  if (error) throw new Error(await getFunctionErrorMessage(error, "Nao foi possivel conectar o WhatsApp."));
  if (data?.error) throw new Error(data.error);
  return {
    ok: Boolean(data?.ok),
    status: data?.status as EvolutionFrontendStatus,
    qr: data?.qr as string | null | undefined,
    instance: data?.instance ? mapInstance(data.instance) : null
  };
}

async function getFunctionErrorMessage(error: unknown, fallback: string) {
  const context = (error as { context?: Response })?.context;
  if (context) {
    try {
      const payload = await context.clone().json();
      if (payload?.error) return String(payload.error);
      if (payload?.message) return String(payload.message);
    } catch {
      try {
        const text = await context.clone().text();
        if (text) return text.slice(0, 300);
      } catch {
        return fallback;
      }
    }
  }
  const message = (error as Error)?.message;
  return message ? `${fallback}: ${message}` : fallback;
}

export async function refreshEvolutionStatus(clinicId: string, instanceId: string) {
  const { data, error } = await supabase.functions.invoke("evolution-instance", {
    body: { clinicId, action: "status", instanceId }
  });
  if (error) throw new Error("Nao foi possivel verificar o status.");
  if (data?.error) throw new Error(data.error);
  return data as { ok: boolean; status: EvolutionFrontendStatus };
}

export async function disconnectEvolutionInstance(clinicId: string, instanceId: string) {
  const { data, error } = await supabase.functions.invoke("evolution-instance", {
    body: { clinicId, action: "disconnect", instanceId }
  });
  if (error) throw new Error("Nao foi possivel desconectar.");
  if (data?.error) throw new Error(data.error);
}

export async function deleteEvolutionInstance(clinicId: string, instanceId: string) {
  const { data, error } = await supabase.functions.invoke("evolution-instance", {
    body: { clinicId, action: "delete", instanceId }
  });
  if (error) throw new Error("Nao foi possivel deletar a instancia.");
  if (data?.error) throw new Error(data.error);
}

export async function loadWhatsAppConversations(clinicId: string, _instanceId?: string | null) {
  const { data: conversas, error } = await supabase
    .from("whatsapp_conversas")
    .select("*")
    .eq("clinica_id", clinicId)
    .order("ultima_mensagem_em", { ascending: false, nullsFirst: false });
  if (error) throw error;
  if (!conversas?.length) return [] as WhatsAppConversation[];

  const contatoIds = [...new Set(conversas.map((c: any) => c.contato_id).filter(Boolean))];
  const conversaIds = conversas.map((c: any) => c.id);

  const [{ data: contatos }, { data: aiSettingsRows }] = await Promise.all([
    supabase.from("whatsapp_contatos").select("*").in("id", contatoIds),
    supabase.from("ai_conversation_settings").select("*").in("conversation_id", conversaIds)
  ]);

  const contatoMap: Record<string, any> = Object.fromEntries(
    (contatos ?? []).map((c: any) => [c.id, c])
  );
  const aiSettingsMap: Record<string, any> = Object.fromEntries(
    (aiSettingsRows ?? []).map((s: any) => [s.conversation_id, s])
  );

  return conversas.map((row: any) =>
    mapConversation(row, contatoMap[row.contato_id], aiSettingsMap[row.id])
  ) as WhatsAppConversation[];
}

export async function loadWhatsAppMessages(clinicId: string, conversationId: string) {
  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .select("*")
    .eq("clinica_id", clinicId)
    .eq("conversa_id", conversationId)
    .order("enviada_em", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMessage) as WhatsAppMessage[];
}

export async function uploadMediaFile(clinicId: string, conversationId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const path = `${clinicId}/${conversationId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from("whatsapp-media")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("whatsapp-media").getPublicUrl(path);
  return data.publicUrl;
}

export async function loadAiAgents(clinicId: string) {
  const { data, error } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map(mapAgent) as AiAgent[];
}

export async function saveAiAgent(clinicId: string, agent: Partial<AiAgent> & { id?: string; name: string }) {
  const payload = {
    clinic_id: clinicId,
    name: agent.name,
    provider: agent.provider ?? "openai",
    model: agent.model ?? "gpt-5.2",
    system_prompt: agent.systemPrompt ?? "",
    active: agent.active ?? true
  };
  const result = agent.id
    ? await supabase.from("ai_agents").update(payload).eq("id", agent.id).eq("clinic_id", clinicId)
    : await supabase.from("ai_agents").insert(payload);
  if (result.error) throw result.error;
}

export async function saveConversationAiSettings(input: {
  clinicId: string;
  conversationId: string;
  aiEnabled: boolean;
  agentId: string | null;
  humanTakeover: boolean;
  aiMode: AiMode;
  suggestedResponse?: string | null;
}) {
  const { error } = await supabase
    .from("ai_conversation_settings")
    .upsert({
      clinic_id: input.clinicId,
      conversation_id: input.conversationId,
      ai_enabled: input.aiEnabled,
      agent_id: input.agentId,
      human_takeover: input.humanTakeover,
      ai_mode: input.aiMode,
      suggested_response: input.suggestedResponse ?? null
    }, { onConflict: "clinic_id,conversation_id" });
  if (error) throw error;
}

function detectMediaType(mimeType: string): "image" | "video" | "audio" | "document" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

function mapInstance(row: any): WhatsAppInstance {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    instanceName: row.instance_name,
    status: row.status,
    phoneNumber: row.phone_number,
    qrCode: row.qr_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapConversation(row: any, contato: any, aiRow?: any): WhatsAppConversation {
  // Resolve o melhor nome disponível: push_name (WhatsApp) > nome (manual) > null
  const resolvedName = contato?.push_name ?? contato?.nome ?? null;

  return {
    id: row.id,
    instanceId: "analise-saude",
    contactId: row.contato_id,
    leadId: row.lead_id ?? null,
    status: row.status ?? "aberta",
    atendimentoStatus: (row.atendimento_status ?? "novo") as AtendimentoStatus,
    lastMessage: row.ultimo_texto ?? null,
    lastMessageAt: row.ultima_mensagem_em ?? null,
    unreadCount: row.unread_count ?? 0,
    contact: {
      id: contato?.id ?? row.contato_id,
      name: resolvedName,
      phone: contato?.telefone ?? row.chat_id ?? "",
      profilePicUrl: contato?.profile_pic_url ?? null,
      pushName: contato?.push_name ?? null,
    },
    aiSettings: aiRow ? {
      id: aiRow.id,
      aiEnabled: aiRow.ai_enabled ?? false,
      agentId: aiRow.agent_id ?? null,
      humanTakeover: aiRow.human_takeover ?? false,
      aiMode: (aiRow.ai_mode ?? "assisted") as AiMode,
      suggestedResponse: aiRow.suggested_response ?? null,
      suggestedAt: aiRow.suggested_at ?? null
    } : null
  };
}

function mapMessage(row: any): WhatsAppMessage {
  return {
    id: row.id,
    direction: (row.direcao === "out" ? "out" : "in") as "in" | "out",
    messageType: (row.tipo as MessageType) ?? "text",
    content: row.texto ?? null,
    mediaUrl: row.media_url ?? null,
    status: null,
    sentAt: row.enviada_em
  };
}

function mapAgent(row: any): AiAgent {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    model: row.model,
    systemPrompt: row.system_prompt,
    active: row.active
  };
}

// ─── Contatos e criação de conversas ─────────────────────────────────────────

export interface WhatsAppContactRecord {
  id: string;
  clinicaId: string;
  nome: string | null;
  pushName: string | null;
  telefone: string;
  chatId: string;
  profilePicUrl: string | null;
  pacienteId: string | null;
  leadId: string | null;
}

function normalizarTelefone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function buildContatoRows(clinicId: string, raw: any[]): Record<string, unknown>[] {
  return raw
    .filter((c: any) => {
      const jid: string = c.id ?? c.remoteJid ?? c.jid ?? "";
      return jid && !jid.includes("@g.us") && jid !== "status@broadcast" && jid.length > 4;
    })
    .map((c: any) => {
      const rawJid: string = c.id ?? c.remoteJid ?? c.jid ?? "";
      const chatId = rawJid.endsWith("@s.whatsapp.net")
        ? rawJid
        : `${rawJid.replace(/\D/g, "")}@s.whatsapp.net`;
      const telefone = chatId.replace("@s.whatsapp.net", "");
      return {
        clinica_id: clinicId,
        chat_id: chatId,
        telefone,
        push_name: c.pushName ?? c.notify ?? c.name ?? c.verifiedName ?? null,
        profile_pic_url: c.profilePictureUrl ?? c.profilePicUrl ?? c.imgUrl ?? null,
        origem: "evolution",
      };
    })
    .filter((r: any) => r.telefone.length >= 8);
}

// Sincroniza contatos da Evolution API com a tabela whatsapp_contatos
async function syncContactsFromEvolution(clinicId: string, instanceName: string): Promise<void> {
  try {
    const { data: res, error } = await supabase.functions.invoke("quick-action", {
      body: { action: "fetch_contacts", instanceName },
    });

    if (error) {
      console.warn("[contacts] invoke error:", error);
      return;
    }

    if (!res?.ok) {
      console.warn("[contacts] fetch_contacts retornou ok=false:", JSON.stringify(res).slice(0, 300));
      return;
    }

    // Evolution API pode retornar vários formatos:
    // - array direto: [{id, pushName, ...}]
    // - objeto com array: {data: [...]} ou {contacts: [...]}
    // - objeto aninhado: {data: {contacts: [...]}}
    const payload = res.data;
    const raw: any[] =
      Array.isArray(payload) ? payload :
      Array.isArray(payload?.data) ? payload.data :
      Array.isArray(payload?.contacts) ? payload.contacts :
      Array.isArray(payload?.data?.contacts) ? payload.data.contacts :
      [];

    console.log(`[contacts] fetchContacts bruto: ${raw.length} itens`);
    if (!raw.length) {
      console.warn("[contacts] nenhum contato retornado. payload:", JSON.stringify(payload).slice(0, 500));
      return;
    }

    const rows = buildContatoRows(clinicId, raw);
    console.log(`[contacts] ${rows.length} contatos após filtro, upserting...`);
    if (!rows.length) return;

    for (let i = 0; i < rows.length; i += 100) {
      const { error: upsertErr } = await supabase
        .from("whatsapp_contatos")
        .upsert(rows.slice(i, i + 100), { onConflict: "clinica_id,chat_id" });
      if (upsertErr) console.warn("[contacts] upsert erro:", upsertErr.message);
    }
    console.log(`[contacts] sync concluído: ${rows.length} contatos`);
  } catch (e) {
    console.warn("[contacts] sync falhou:", e instanceof Error ? e.message : e);
  }
}

export async function loadWhatsAppContacts(clinicId: string, instanceName?: string): Promise<WhatsAppContactRecord[]> {
  // Primeiro sincroniza todos os contatos da instância Evolution (best-effort)
  if (instanceName) {
    await syncContactsFromEvolution(clinicId, instanceName);
  }

  const { data, error } = await supabase
    .from("whatsapp_contatos")
    .select("*")
    .eq("clinica_id", clinicId)
    .order("push_name", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    clinicaId: row.clinica_id,
    nome: row.nome ?? row.push_name ?? null,
    pushName: row.push_name ?? null,
    telefone: row.telefone,
    chatId: row.chat_id,
    profilePicUrl: row.profile_pic_url ?? null,
    pacienteId: row.paciente_id ?? null,
    leadId: row.lead_id ?? null,
  }));
}

export async function upsertWhatsAppContact(clinicId: string, input: { nome?: string | null; telefone: string }): Promise<WhatsAppContactRecord> {
  const telefone = normalizarTelefone(input.telefone);
  const chatId = `${telefone}@s.whatsapp.net`;

  const { error: upsertErr } = await supabase
    .from("whatsapp_contatos")
    .upsert(
      { clinica_id: clinicId, nome: input.nome ?? null, telefone, chat_id: chatId, origem: "manual" },
      { onConflict: "clinica_id,chat_id" }
    );
  if (upsertErr) throw upsertErr;

  const { data, error } = await supabase
    .from("whatsapp_contatos")
    .select("*")
    .eq("clinica_id", clinicId)
    .eq("chat_id", chatId)
    .single();
  if (error) throw error;

  return {
    id: data.id,
    clinicaId: data.clinica_id,
    nome: data.nome ?? null,
    pushName: data.push_name ?? null,
    telefone: data.telefone,
    chatId: data.chat_id,
    profilePicUrl: data.profile_pic_url ?? null,
    pacienteId: data.paciente_id ?? null,
    leadId: data.lead_id ?? null,
  };
}

export async function markConversationRead(clinicId: string, conversationId: string): Promise<void> {
  await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
    p_clinic_id: clinicId,
  });
}

export async function updateContactAtendimentoStatus(
  clinicId: string,
  conversationId: string,
  status: AtendimentoStatus
): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_conversas")
    .update({ atendimento_status: status })
    .eq("id", conversationId)
    .eq("clinica_id", clinicId);
  if (error) throw error;
}

export async function saveContactProfilePic(clinicId: string, contactId: string, url: string): Promise<void> {
  await supabase
    .from("whatsapp_contatos")
    .update({ profile_pic_url: url, pic_fetched_at: new Date().toISOString() })
    .eq("id", contactId)
    .eq("clinica_id", clinicId);
}

export async function findOrCreateConversation(clinicId: string, contactId: string, chatId: string): Promise<WhatsAppConversation> {
  const { error: upsertErr } = await supabase
    .from("whatsapp_conversas")
    .upsert(
      { clinica_id: clinicId, contato_id: contactId, chat_id: chatId, status: "aberta" },
      { onConflict: "clinica_id,chat_id" }
    );
  if (upsertErr) throw upsertErr;

  const { data: conv, error: convErr } = await supabase
    .from("whatsapp_conversas")
    .select("*")
    .eq("clinica_id", clinicId)
    .eq("chat_id", chatId)
    .single();
  if (convErr) throw convErr;

  const { data: contato } = await supabase
    .from("whatsapp_contatos")
    .select("*")
    .eq("id", contactId)
    .single();

  return mapConversation(conv, contato, null);
}
