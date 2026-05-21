import { supabase } from "../lib/supabaseClient";

export interface WhatsAppContact {
  id: string;
  nome: string | null;
  telefone: string;
  chatId: string;
  leadId: string | null;
  pacienteId: string | null;
}

export interface WhatsAppConversation {
  id: string;
  chatId: string;
  status: string;
  ultimoTexto: string | null;
  ultimaMensagemEm: string | null;
  leadId: string | null;
  contato: WhatsAppContact;
}

export interface WhatsAppMessage {
  id: string;
  direcao: "in" | "out";
  texto: string | null;
  enviadaEm: string;
}

// Status normalizados devolvidos pelo backend
export type WahaFrontendStatus =
  | "connected"
  | "qr_required"
  | "starting"
  | "failed"
  | "disconnected";

export interface WahaConnectResult {
  ok: boolean;
  status: WahaFrontendStatus;
  qr?: string | null;
  session?: string;
}

// Aciona a máquina de estados no backend: cria / inicia / reinicia a sessão
// e devolve o estado atual (connected, qr_required, starting, failed, disconnected).
export async function connectWaha(clinicId: string): Promise<WahaConnectResult> {
  const { data, error } = await supabase.functions.invoke("waha-status", {
    body: { clinicId, action: "connect" }
  });
  if (error) throw new Error("Não foi possível conectar o WhatsApp. Tente novamente.");
  if (!data?.ok && data?.status === "failed") throw new Error(data.message ?? "Falha ao conectar.");
  return data as WahaConnectResult;
}

// Consulta apenas o status atual (sem criar/iniciar nada)
export async function getWahaStatus(clinicId: string): Promise<WahaConnectResult> {
  const { data, error } = await supabase.functions.invoke("waha-status", {
    body: { clinicId, action: "status" }
  });
  if (error) throw new Error("Não foi possível verificar o status do WhatsApp.");
  return data as WahaConnectResult;
}

// Busca o QR Code atual (para polling enquanto aguarda escaneamento)
export async function getWahaQrCode(clinicId: string): Promise<{ ok: boolean; qr: string | null }> {
  const { data, error } = await supabase.functions.invoke("waha-status", {
    body: { clinicId, action: "qr" }
  });
  if (error) throw new Error("Não foi possível obter o QR Code.");
  return data as { ok: boolean; qr: string | null };
}

// Desconecta a sessão (número permanece nos arquivos se volume configurado)
export async function disconnectWaha(clinicId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("waha-status", {
    body: { clinicId, action: "disconnect" }
  });
  if (error) throw new Error("Não foi possível desconectar o WhatsApp.");
  if (data?.error) throw new Error("Erro ao desconectar.");
}

export async function loadWhatsAppConversations(clinicId: string) {
  const { data, error } = await supabase
    .from("whatsapp_conversas")
    .select("*, contato:whatsapp_contatos(*)")
    .eq("clinica_id", clinicId)
    .order("ultima_mensagem_em", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row: any): WhatsAppConversation => ({
    id: row.id,
    chatId: row.chat_id,
    status: row.status,
    ultimoTexto: row.ultimo_texto,
    ultimaMensagemEm: row.ultima_mensagem_em,
    leadId: row.lead_id,
    contato: {
      id: row.contato?.id,
      nome: row.contato?.nome ?? null,
      telefone: row.contato?.telefone,
      chatId: row.contato?.chat_id,
      leadId: row.contato?.lead_id ?? null,
      pacienteId: row.contato?.paciente_id ?? null
    }
  }));
}

export async function loadWhatsAppMessages(clinicId: string, conversationId: string) {
  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .select("*")
    .eq("clinica_id", clinicId)
    .eq("conversa_id", conversationId)
    .order("enviada_em", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any): WhatsAppMessage => ({
    id: row.id,
    direcao: row.direcao,
    texto: row.texto,
    enviadaEm: row.enviada_em
  }));
}

export async function sendWhatsAppMessage(input: {
  clinicId: string;
  conversaId: string;
  contatoId: string;
  chatId: string;
  text: string;
}) {
  const { data, error } = await supabase.functions.invoke("waha-send-message", { body: input });
  if (error) throw new Error("Não foi possível enviar a mensagem.");
  if (data?.error) throw new Error("Erro ao enviar mensagem.");
}
