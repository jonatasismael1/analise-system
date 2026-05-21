import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import {
  Bot, CheckCheck, FileUp, Loader2, MessageCircle,
  Mic, PlusCircle, RefreshCcw, Search,
  Send, Sparkles, Tag, UserPlus, UserRound, Wifi, WifiOff, X
} from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { askDeby } from "../../../services/debyService";
import { savePatientRecord } from "../../../services/patientService";
import {
  loadAiAgents,
  loadWhatsAppConversations,
  loadWhatsAppMessages,
  saveAiAgent,
  saveConversationAiSettings,
  uploadMediaFile,
  type AiAgent,
  type AiMode,
  type MessageType,
  type WhatsAppConversation,
  type WhatsAppMessage
} from "../../../services/evolutionService";
import {
  connectInstance,
  createInstance,
  DEFAULT_INSTANCE_NAME,
  getInstanceStatus,
  logoutInstance,
  sendWhatsAppMedia,
  sendWhatsAppText,
  setInstanceWebhook,
  type EvolutionState
} from "../../../services/quickActionService";
import {
  createLeadFromConversation,
  loadLeadStages,
  loadLeads,
  type Lead,
  type LeadStage
} from "../../../services/leadService";
import { Field, inputClass } from "../components/Field";

// ── Tipos internos ─────────────────────────────────────────────────────────────

type ConnStatus = "checking" | "disconnected" | "connecting" | "qr" | "connected";

// ── Helpers ────────────────────────────────────────────────────────────────────

function msgTime(val: string | null) {
  if (!val) return "";
  return new Date(val).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string | null | undefined, phone: string) {
  return ((name || phone).trim()).slice(0, 2).toUpperCase();
}

const STATUS_LABEL: Record<EvolutionState, string> = {
  open: "Conectado",
  close: "Desconectado",
  connecting: "Conectando",
  refused: "Recusado",
  unknown: "Aguardando"
};

// ── WhatsApp Logo inline ───────────────────────────────────────────────────────

function WhatsAppLogo({ className = "h-5 w-5" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-[#25D366]`}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Panel
// ══════════════════════════════════════════════════════════════════════════════

export function WhatsAppPanel({ clinicId }: { readonly clinicId: string }) {
  // ── Conexão ────────────────────────────────────────────────────────────────
  const [connStatus, setConnStatus] = useState<ConnStatus>("checking");
  const [qr, setQr] = useState<{ code: string; b64: string | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Inbox ──────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<LeadStage[]>([]);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "leads" | "ai">("all");
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [debyOutput, setDebyOutput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const convPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Computed ───────────────────────────────────────────────────────────────
  const selected = useMemo(
    () => conversations.find(c => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const selectedLead = useMemo(
    () => leads.find(l => l.id === selected?.leadId) ?? null,
    [leads, selected]
  );

  const debyAgent = agents.find(a => a.name === "Deby AI") ?? agents[0] ?? null;

  const filtered = useMemo(() => {
    let list = conversations;
    if (filter === "leads") list = list.filter(c => c.leadId);
    if (filter === "ai") list = list.filter(c => c.aiSettings?.aiEnabled);
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(c =>
      `${c.contact.name ?? ""} ${c.contact.phone} ${c.lastMessage ?? ""}`.toLowerCase().includes(term)
    );
  }, [conversations, filter, search]);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadInboxData = useCallback(async () => {
    const [convs, agts, ldsData, stgsData] = await Promise.all([
      loadWhatsAppConversations(clinicId).catch(() => [] as WhatsAppConversation[]),
      loadAiAgents(clinicId).catch(() => [] as AiAgent[]),
      loadLeads(clinicId).catch(() => [] as Lead[]),
      loadLeadStages(clinicId).catch(() => [] as LeadStage[])
    ]);
    setConversations(convs);
    setAgents(agts);
    setLeads(ldsData);
    setStages(stgsData);
    setSelectedId(prev => prev ?? (convs[0]?.id ?? null));
  }, [clinicId]);

  // ── Check de status inicial ────────────────────────────────────────────────

  const checkStatus = useCallback(async () => {
    try {
      const state = await getInstanceStatus(DEFAULT_INSTANCE_NAME);
      if (state === "open") {
        stopQrPoll();
        setQr(null);
        setConnStatus("connected");
        await loadInboxData();
      } else {
        setConnStatus("disconnected");
      }
    } catch {
      setConnStatus("disconnected");
    }
  }, [loadInboxData]);

  useEffect(() => {
    void checkStatus();
    return () => {
      stopQrPoll();
      stopMsgPoll();
      stopConvPoll();
    };
  }, [checkStatus]);

  // ── Auto-refresh de conversas (10s) quando conectado ──────────────────────

  useEffect(() => {
    stopConvPoll();
    if (connStatus !== "connected") return;
    convPollRef.current = setInterval(() => {
      loadWhatsAppConversations(clinicId)
        .then(convs => setConversations(convs))
        .catch(() => null);
    }, 10000);
    return stopConvPoll;
  }, [clinicId, connStatus]);

  // ── Carrega mensagens quando muda conversa ─────────────────────────────────

  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    void loadWhatsAppMessages(clinicId, selected.id).then(setMessages).catch(() => null);
  }, [clinicId, selected?.id]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Realtime: novas mensagens aparecem instantaneamente ───────────────────

  useEffect(() => {
    if (connStatus !== "connected") return;

    const channel = supabase
      .channel(`wa_msgs_${clinicId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_mensagens", filter: `clinica_id=eq.${clinicId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.conversa_id === selectedId) {
            setMessages(prev => {
              // Dedup: não adiciona se o ID já existe
              if (prev.some(m => m.id === (row.id as string))) return prev;
              return [
                ...prev,
                {
                  id: row.id as string,
                  direction: (row.direcao === "out" ? "out" : "in") as "in" | "out",
                  messageType: ((row.tipo as MessageType) ?? "text"),
                  content: (row.texto as string | null) ?? null,
                  mediaUrl: (row.media_url as string | null) ?? null,
                  status: null,
                  sentAt: row.enviada_em as string,
                }
              ];
            });
          }
          // Atualiza sidebar de conversas para refletir a última mensagem
          loadWhatsAppConversations(clinicId)
            .then(convs => setConversations(convs))
            .catch(() => null);
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [clinicId, connStatus, selectedId]);

  // ── Poll de mensagens (fallback a cada 15s) ────────────────────────────────

  useEffect(() => {
    stopMsgPoll();
    if (!selected || connStatus !== "connected") return;
    msgPollRef.current = setInterval(async () => {
      const msgs = await loadWhatsAppMessages(clinicId, selected.id).catch(() => null);
      if (msgs) setMessages(msgs);
    }, 15000);
    return stopMsgPoll;
  }, [clinicId, selected?.id, connStatus]);

  // ── Helpers de polling ─────────────────────────────────────────────────────

  function stopQrPoll() {
    if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
  }

  function stopMsgPoll() {
    if (msgPollRef.current) { clearInterval(msgPollRef.current); msgPollRef.current = null; }
  }

  function stopConvPoll() {
    if (convPollRef.current) { clearInterval(convPollRef.current); convPollRef.current = null; }
  }

  function startQrPolling() {
    stopQrPoll();
    qrPollRef.current = setInterval(async () => {
      try {
        const state = await getInstanceStatus(DEFAULT_INSTANCE_NAME);
        if (state === "open") {
          stopQrPoll();
          setQr(null);
          setConnStatus("connected");
          await loadInboxData();
        }
      } catch {
        // continua tentando
      }
    }, 5000);
  }

  // ── Ações de conexão ───────────────────────────────────────────────────────

  async function handleConnect() {
    setConnStatus("connecting");
    setNotice(null);
    try {
      // Tenta criar (ignora erro se já existir)
      await createInstance(DEFAULT_INSTANCE_NAME).catch(() => null);
      // Configura webhook para receber mensagens no Supabase (erro não bloqueia o fluxo)
      setInstanceWebhook(DEFAULT_INSTANCE_NAME, clinicId).catch(() => null);
      // Gera o QR code
      const result = await connectInstance(DEFAULT_INSTANCE_NAME);
      const code = result.base64 || result.code;
      if (code) {
        setQr({ code, b64: result.base64 });
        setConnStatus("qr");
        startQrPolling();
      } else {
        // Pode já estar conectado
        await checkStatus();
      }
    } catch (e) {
      setConnStatus("disconnected");
      setNotice(e instanceof Error ? e.message : "Erro ao conectar. Tente novamente.");
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Desconectar o WhatsApp da clínica?")) return;
    stopQrPoll();
    stopMsgPoll();
    try {
      await logoutInstance(DEFAULT_INSTANCE_NAME);
    } catch {
      // ignora
    }
    setQr(null);
    setConnStatus("disconnected");
    setConversations([]);
    setMessages([]);
    setSelectedId(null);
  }

  async function handleVerifyQr() {
    await checkStatus();
  }

  // ── Ações de mensagem ──────────────────────────────────────────────────────

  async function handleSend() {
    if (!selected || (!reply.trim() && !file)) return;
    setSending(true);
    try {
      const phone = selected.contact.phone;
      const nowIso = new Date().toISOString();
      let textoEnviado = reply.trim();
      let uploadedMediaUrl: string | null = null;
      let mediaType: "image" | "video" | "audio" | "document" | "text" = "text";

      if (file) {
        uploadedMediaUrl = await uploadMediaFile(clinicId, selected.id, file);
        mediaType = file.type.startsWith("image/") ? "image"
          : file.type.startsWith("video/") ? "video"
          : file.type.startsWith("audio/") ? "audio"
          : "document";
        textoEnviado = reply.trim() || `[${mediaType}]`;
        await sendWhatsAppMedia({
          instanceName: DEFAULT_INSTANCE_NAME,
          phone,
          mediaUrl: uploadedMediaUrl,
          mediaType,
          caption: reply.trim(),
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
        });
      } else {
        await sendWhatsAppText(DEFAULT_INSTANCE_NAME, phone, textoEnviado);
      }

      // Salva mensagem no banco e obtém o ID gerado
      const { data: inserted, error: insertErr } = await supabase
        .from("whatsapp_mensagens")
        .insert({
          clinica_id: clinicId,
          conversa_id: selected.id,
          contato_id: selected.contactId,
          direcao: "out",
          tipo: mediaType,
          texto: textoEnviado,
          media_url: uploadedMediaUrl,
          payload: {},
          enviada_em: nowIso,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      // Adiciona mensagem ao estado local imediatamente — não depende só do Realtime
      if (inserted) {
        setMessages(prev => {
          if (prev.some(m => m.id === inserted.id)) return prev;
          return [...prev, {
            id: inserted.id,
            direction: "out" as const,
            messageType: (file ? mediaType : "text") as MessageType,
            content: textoEnviado,
            mediaUrl: uploadedMediaUrl,
            status: null,
            sentAt: nowIso,
          }];
        });
      }

      // Atualiza ultimo_texto na conversa para refletir na sidebar
      await supabase.from("whatsapp_conversas")
        .update({ ultimo_texto: textoEnviado, ultima_mensagem_em: nowIso })
        .eq("id", selected.id)
        .eq("clinica_id", clinicId);

      // Recarrega lista de conversas para atualizar a sidebar
      loadWhatsAppConversations(clinicId).then(setConversations).catch(() => null);

      setReply("");
      setFile(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  // ── Ações de IA ────────────────────────────────────────────────────────────

  async function handleAiAction(action: "whatsapp_summary" | "whatsapp_reply") {
    if (!selected || messages.length === 0) return;
    setAiLoading(true);
    try {
      const transcript = messages
        .map(m => `${m.direction === "in" ? "Contato" : "Clínica"}: ${m.content ?? `[${m.messageType}]`}`)
        .join("\n");
      const output = await askDeby({
        clinicId,
        action,
        module: "whatsapp",
        text: `Contato: ${selected.contact.name ?? selected.contact.phone}\nConversa:\n${transcript}`
      });
      if (action === "whatsapp_reply") setReply(output);
      else setDebyOutput(output);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erro na Deby AI.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleUpdateAiSettings(values: { aiEnabled?: boolean; humanTakeover?: boolean; aiMode?: AiMode }) {
    if (!selected) return;
    const cur = selected.aiSettings;
    await saveConversationAiSettings({
      clinicId,
      conversationId: selected.id,
      aiEnabled: values.aiEnabled ?? cur?.aiEnabled ?? false,
      agentId: cur?.agentId ?? debyAgent?.id ?? null,
      humanTakeover: values.humanTakeover ?? cur?.humanTakeover ?? false,
      aiMode: values.aiMode ?? cur?.aiMode ?? "assisted"
    });
    await loadInboxData();
  }

  // ── Ações de Lead ──────────────────────────────────────────────────────────

  async function handleCreateLead() {
    if (!selected) return;
    setCreatingLead(true);
    setNotice(null);
    try {
      await createLeadFromConversation({
        clinicId,
        conversationId: selected.id,
        contactId: selected.contactId,
        name: selected.contact.name ?? selected.contact.phone,
        phone: selected.contact.phone,
        stageId: stages[0]?.id ?? null
      });
      await loadInboxData();
      setNotice("Lead criado e vinculado!");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erro ao criar lead.");
    } finally {
      setCreatingLead(false);
    }
  }

  async function handleCreatePatient() {
    if (!selected) return;
    setCreatingPatient(true);
    setNotice(null);
    try {
      const phone = selected.contact.phone.replace(/\D/g, "");
      const { error } = await savePatientRecord(clinicId, {
        id: "",
        clinicaId: clinicId,
        nome: selected.contact.name ?? selected.contact.phone,
        whatsapp: phone,
        status: "ativo",
        valorTotalGasto: 0,
      });
      if (error) throw error;
      setNotice("Paciente criado com sucesso! Acesse o módulo Pacientes para completar o cadastro.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erro ao criar paciente.");
    } finally {
      setCreatingPatient(false);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-card">

      {/* ── Barra de status / conexão ──────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25D366]/10">
            <WhatsAppLogo />
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface">WhatsApp Business</p>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${
                connStatus === "connected" ? "bg-emerald-500" :
                connStatus === "qr" || connStatus === "connecting" ? "bg-amber-400 animate-pulse" :
                connStatus === "checking" ? "bg-blue-400 animate-pulse" :
                "bg-outline"
              }`} />
              <span className="text-xs text-on-surface-variant">
                {connStatus === "checking" ? "Verificando..." :
                 connStatus === "connecting" ? "Criando conexão..." :
                 connStatus === "qr" ? "Aguardando QR Code" :
                 connStatus === "connected" ? `${DEFAULT_INSTANCE_NAME} · Conectado` :
                 `${DEFAULT_INSTANCE_NAME} · Desconectado`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connStatus === "connected" && (
            <>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:border-primary hover:text-primary"
                onClick={() => void loadInboxData()}
                type="button"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:border-red-400 hover:text-red-500"
                onClick={() => void handleDisconnect()}
                type="button"
              >
                <WifiOff className="h-3.5 w-3.5" />
                Desconectar
              </button>
            </>
          )}
          {connStatus === "qr" && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary"
              onClick={() => void handleVerifyQr()}
              type="button"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Verificar conexão
            </button>
          )}
          {(connStatus === "disconnected") && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1ebe5d]"
              onClick={() => void handleConnect()}
              type="button"
            >
              <Wifi className="h-3.5 w-3.5" />
              Conectar WhatsApp
            </button>
          )}
        </div>
      </div>

      {/* ── Aviso ──────────────────────────────────────────────────────────── */}
      {notice && (
        <div className="flex items-center justify-between border-b border-outline-variant bg-amber-50 px-5 py-2">
          <p className="text-xs text-amber-800">{notice}</p>
          <button className="text-amber-600 hover:text-amber-900" type="button" onClick={() => setNotice(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Conteúdo principal ─────────────────────────────────────────────── */}

      {/* Verificando */}
      {connStatus === "checking" && (
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary/40" />
            <p className="text-sm text-on-surface-variant">Verificando conexão...</p>
          </div>
        </div>
      )}

      {/* Conectando */}
      {connStatus === "connecting" && (
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#25D366]" />
            <p className="text-base font-semibold text-on-surface">Criando conexão...</p>
            <p className="mt-1 text-sm text-on-surface-variant">Aguarde enquanto preparamos o QR Code.</p>
          </div>
        </div>
      )}

      {/* QR Code */}
      {connStatus === "qr" && qr && (
        <div className="flex min-h-[500px] items-center justify-center p-8">
          <div className="w-full max-w-sm rounded-2xl border border-outline-variant bg-surface p-8 text-center shadow-card">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366]/10">
              <WhatsAppLogo className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-on-surface">Escaneie o QR Code</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              No WhatsApp, abra <strong>Configurações → Aparelhos conectados → Conectar aparelho</strong>
            </p>

            <div className="my-6 flex justify-center">
              {qr.b64 || qr.code.startsWith("data:") ? (
                <img
                  src={qr.b64 ?? qr.code}
                  alt="QR Code WhatsApp"
                  className="h-56 w-56 rounded-2xl border border-outline-variant bg-white object-contain p-3"
                />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container p-4 font-mono text-[10px] break-all text-center text-on-surface-variant">
                  {qr.code || "QR Code indisponível"}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verificando conexão automaticamente...
            </div>

            <button
              className="mt-4 w-full rounded-xl border border-outline-variant py-2.5 text-sm font-medium hover:border-primary hover:text-primary"
              type="button"
              onClick={() => void handleVerifyQr()}
            >
              Já escaniei — verificar agora
            </button>

            <button
              className="mt-2 text-xs text-outline hover:text-on-surface-variant"
              type="button"
              onClick={() => void handleConnect()}
            >
              Gerar novo QR Code
            </button>
          </div>
        </div>
      )}

      {/* Desconectado */}
      {connStatus === "disconnected" && (
        <div className="flex min-h-[500px] items-center justify-center p-8">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#25D366]/10">
              <WhatsAppLogo className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-on-surface">Conecte o WhatsApp</h3>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
              Clique no botão abaixo para conectar o WhatsApp da clínica.
              Um QR Code será gerado para você escanear.
            </p>
            <button
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1ebe5d]"
              onClick={() => void handleConnect()}
              type="button"
            >
              <Wifi className="h-5 w-5" />
              Conectar WhatsApp
            </button>
            <p className="mt-3 text-xs text-outline">Instância: {DEFAULT_INSTANCE_NAME}</p>
          </div>
        </div>
      )}

      {/* ── Inbox (quando conectado) ────────────────────────────────────────── */}
      {connStatus === "connected" && (
        <div className="grid min-h-[660px] xl:grid-cols-[300px_minmax(0,1fr)_280px]">

          {/* Coluna esquerda: conversas */}
          <aside className="flex flex-col border-r border-outline-variant bg-surface-container-lowest">
            <div className="border-b border-outline-variant p-4">
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <input
                  className="h-10 w-full rounded-lg border-none bg-surface-container-low pl-9 pr-3 text-sm text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary"
                  placeholder="Buscar conversas..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1.5">
                {(["all", "leads", "ai"] as const).map(f => (
                  <button
                    key={f}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === f ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
                    onClick={() => setFilter(f)}
                    type="button"
                  >
                    {f === "all" ? "Todos" : f === "leads" ? "Leads" : "IA Ativa"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="Sem conversas"
                    message={conversations.length === 0
                      ? "As mensagens chegam aqui automaticamente quando alguém escrever."
                      : "Nenhuma conversa com este filtro."}
                  />
                </div>
              ) : filtered.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  selected={selected?.id === conv.id}
                  onClick={() => { setSelectedId(conv.id); setDebyOutput(""); }}
                />
              ))}
            </div>
          </aside>

          {/* Coluna central: mensagens */}
          <main className="flex flex-col bg-surface">
            <header className="flex h-14 items-center gap-3 border-b border-outline-variant bg-surface/95 px-4 backdrop-blur">
              {selected ? (
                <Avatar contact={selected.contact} size="sm" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high">
                  <MessageCircle className="h-5 w-5 text-on-surface-variant" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold text-on-surface">
                  {selected ? (selected.contact.name ?? selected.contact.phone) : "Inbox"}
                </h2>
                {selected?.contact.phone && (
                  <p className="text-xs text-on-surface-variant">{selected.contact.phone}</p>
                )}
              </div>
              {selected?.leadId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                  <Tag className="h-3 w-3" />
                  Lead
                </span>
              )}
            </header>

            <div className="flex-1 overflow-y-auto p-4" style={{ background: "#efeae2" }}>
              {!selected ? (
                <div className="flex h-full min-h-[400px] items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="mx-auto mb-3 h-12 w-12 text-outline/20" />
                    <p className="text-sm text-on-surface-variant">Selecione uma conversa.</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="mt-20">
                  <EmptyState title="Sem mensagens" message="As mensagens desta conversa aparecerão aqui." />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {messages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <footer className="border-t border-outline-variant bg-surface p-3">
              {debyOutput && (
                <div className="mb-3 rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-900">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-teal-600">Deby AI</span>
                    <button className="text-teal-500 hover:text-teal-800" type="button" onClick={() => setDebyOutput("")}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{debyOutput}</p>
                </div>
              )}
              {file && (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-surface-container-high px-3 py-1.5 text-xs text-on-surface-variant">
                  <FileUp className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <button type="button" onClick={() => setFile(null)}><X className="h-3.5 w-3.5" /></button>
                </div>
              )}
              <form
                className="flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20"
                onSubmit={e => { e.preventDefault(); void handleSend(); }}
              >
                <label className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-on-surface-variant hover:text-primary">
                  <PlusCircle className="h-5 w-5" />
                  <input className="hidden" type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </label>
                <input
                  className="min-w-0 flex-1 border-none bg-transparent px-1 py-2 text-sm text-on-surface placeholder:text-outline focus:ring-0"
                  disabled={!selected}
                  placeholder={selected ? "Digite uma mensagem..." : "Selecione uma conversa..."}
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                />
                <button className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:text-primary" type="button">
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
                  disabled={sending || !selected || (!reply.trim() && !file)}
                  type="submit"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </footer>
          </main>

          {/* Coluna direita: contato + IA */}
          <aside className="hidden flex-col border-l border-outline-variant bg-surface xl:flex">
            {selected ? (
              <ContactAiPanel
                conversation={selected}
                messages={messages}
                lead={selectedLead}
                stages={stages}
                debyAgent={debyAgent}
                loading={aiLoading || creatingLead}
                creatingPatient={creatingPatient}
                onUpdateAiSettings={handleUpdateAiSettings}
                onSummarize={() => void handleAiAction("whatsapp_summary")}
                onSuggestReply={() => void handleAiAction("whatsapp_reply")}
                onSaveAgent={async (agent) => { await saveAiAgent(clinicId, agent); setAgents(await loadAiAgents(clinicId)); }}
                onUseReply={text => setReply(text)}
                onCreateLead={() => void handleCreateLead()}
                onCreatePatient={() => void handleCreatePatient()}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="text-center">
                  <UserRound className="mx-auto mb-3 h-12 w-12 text-outline/20" />
                  <p className="text-sm text-on-surface-variant">Selecione uma conversa.</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

// ── ConversationItem ───────────────────────────────────────────────────────────

function ConversationItem({ conversation, selected, onClick }: {
  readonly conversation: WhatsAppConversation;
  readonly selected: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      className={`flex w-full items-center gap-3 border-b border-outline-variant/20 p-4 text-left transition ${
        selected ? "border-l-4 border-l-primary bg-primary/5" : "hover:bg-surface-container-low"
      }`}
      onClick={onClick}
      type="button"
    >
      <Avatar contact={conversation.contact} />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-bold text-on-surface">
            {conversation.contact.name ?? conversation.contact.phone}
          </h3>
          <span className="shrink-0 text-[11px] text-outline">{msgTime(conversation.lastMessageAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <p className="flex-1 truncate text-xs text-on-surface-variant">
            {conversation.lastMessage ?? "Sem mensagens"}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {conversation.leadId && <span className="h-2 w-2 rounded-full bg-primary" />}
            {conversation.aiSettings?.aiEnabled && <Bot className="h-3 w-3 text-teal-500" />}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── ContactAiPanel ─────────────────────────────────────────────────────────────

function ContactAiPanel({ conversation, messages, lead, stages, debyAgent, loading, creatingPatient, onUpdateAiSettings, onSummarize, onSuggestReply, onSaveAgent, onUseReply, onCreateLead, onCreatePatient }: {
  readonly conversation: WhatsAppConversation;
  readonly messages: WhatsAppMessage[];
  readonly lead: Lead | null;
  readonly stages: LeadStage[];
  readonly debyAgent: AiAgent | null;
  readonly loading: boolean;
  readonly creatingPatient: boolean;
  readonly onUpdateAiSettings: (v: { aiEnabled?: boolean; humanTakeover?: boolean; aiMode?: AiMode }) => Promise<void>;
  readonly onSummarize: () => void;
  readonly onSuggestReply: () => void;
  readonly onSaveAgent: (a: AiAgent) => Promise<void>;
  readonly onUseReply: (text: string) => void;
  readonly onCreateLead: () => void;
  readonly onCreatePatient: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-outline-variant p-5 text-center">
        <Avatar contact={conversation.contact} size="lg" />
        <h2 className="mt-3 text-base font-bold text-on-surface">
          {conversation.contact.name ?? conversation.contact.phone}
        </h2>
        <p className="mt-0.5 text-sm text-on-surface-variant">{conversation.contact.phone}</p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {/* Lead / CRM */}
        <section>
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-outline">Lead / CRM</h3>
          {lead ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-primary">{lead.nome}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  lead.temperatura === "quente" ? "bg-red-50 text-red-600" :
                  lead.temperatura === "morno" ? "bg-amber-50 text-amber-600" :
                  "bg-blue-50 text-blue-600"
                }`}>
                  {lead.temperatura}
                </span>
              </div>
              {stages.length > 0 && (
                <div className="mt-2 rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-xs text-on-surface-variant">
                  {stages.find(s => s.id === lead.etapaId)?.nome ?? "Sem etapa"}
                </div>
              )}
              <p className="mt-2 text-center text-[10px] text-outline">Gerencie no painel Kanban</p>
            </div>
          ) : (
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 py-2.5 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-60"
              onClick={onCreateLead}
              disabled={loading}
              type="button"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
              Converter em Lead
            </button>
          )}

          <button
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 py-2.5 text-sm font-medium text-on-surface-variant hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-60"
            onClick={onCreatePatient}
            disabled={creatingPatient}
            type="button"
          >
            {creatingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Converter em Paciente
          </button>
        </section>

        {/* Deby AI */}
        <section>
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-outline">Deby AI</h3>
          <div className="space-y-3">
            <AiToggle
              label="IA ativada"
              checked={conversation.aiSettings?.aiEnabled ?? false}
              onChange={checked => void onUpdateAiSettings({ aiEnabled: checked })}
            />
            <AiToggle
              label="Atendimento humano"
              checked={conversation.aiSettings?.humanTakeover ?? false}
              onChange={checked => void onUpdateAiSettings({ humanTakeover: checked })}
            />
            <Field label="Modo">
              <select
                className={inputClass()}
                value={conversation.aiSettings?.aiMode ?? "assisted"}
                onChange={e => void onUpdateAiSettings({ aiMode: e.target.value as AiMode })}
              >
                <option value="assisted">Assistido</option>
                <option value="automatic">Automático</option>
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant px-2 py-2 text-xs font-medium hover:border-teal-500 hover:text-teal-600 disabled:opacity-60"
                type="button"
                onClick={onSummarize}
                disabled={loading || messages.length === 0}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Resumir
              </button>
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant px-2 py-2 text-xs font-medium hover:border-teal-500 hover:text-teal-600 disabled:opacity-60"
                type="button"
                onClick={onSuggestReply}
                disabled={loading || messages.length === 0}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                Sugerir
              </button>
            </div>

            {conversation.aiSettings?.suggestedResponse && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Sugestão pendente</p>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-amber-900">
                  {conversation.aiSettings.suggestedResponse}
                </p>
                <button
                  className="mt-2.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
                  type="button"
                  onClick={() => onUseReply(conversation.aiSettings?.suggestedResponse ?? "")}
                >
                  Usar resposta
                </button>
              </div>
            )}

            {debyAgent && <DebyPromptEditor agent={debyAgent} onSave={onSaveAgent} />}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Avatar({ contact, size = "md" }: {
  readonly contact: WhatsAppConversation["contact"];
  readonly size?: "sm" | "md" | "lg";
}) {
  const cls = size === "lg" ? "h-16 w-16 text-xl" : size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  if (contact.profilePicUrl) {
    return <img className={`${cls} shrink-0 rounded-full object-cover`} src={contact.profilePicUrl} alt="" />;
  }
  return (
    <div className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary`}>
      {initials(contact.name, contact.phone)}
    </div>
  );
}

function MessageBubble({ message }: { readonly message: WhatsAppMessage }) {
  const isOut = message.direction === "out";
  return (
    <div className={`flex items-end gap-1 ${isOut ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[72%] px-3 py-2 text-sm shadow-sm ${
          isOut
            ? "rounded-[10px] rounded-br-[2px] bg-[#d9fdd3] text-[#111b21]"
            : "rounded-[10px] rounded-bl-[2px] bg-white text-[#111b21]"
        }`}
        style={{ wordBreak: "break-word" }}
      >
        {message.mediaUrl && <MediaPreview message={message} />}
        {message.content && (
          <p className="whitespace-pre-wrap leading-snug">{message.content}</p>
        )}
        <div className="mt-0.5 flex items-center justify-end gap-1">
          <span className="text-[11px] text-[#667781]">{msgTime(message.sentAt)}</span>
          {isOut && <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />}
        </div>
      </div>
    </div>
  );
}

function AiToggle({ label, checked, onChange }: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-outline-variant px-3 py-2 text-sm transition hover:border-primary/40">
      <span className="font-medium text-on-surface">{label}</span>
      <input className="h-4 w-4 accent-primary" type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    </label>
  );
}

function DebyPromptEditor({ agent, onSave }: {
  readonly agent: AiAgent;
  readonly onSave: (a: AiAgent) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState(agent.systemPrompt);
  const [saving, setSaving] = useState(false);
  return (
    <div className="space-y-2 border-t border-outline-variant pt-4">
      <Field label="Prompt da Deby">
        <textarea
          className={inputClass()}
          rows={5}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Você é a Deby, assistente da clínica. Responda de forma simpática..."
        />
      </Field>
      <button
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 py-2 text-xs font-semibold hover:border-primary hover:text-primary disabled:opacity-60"
        type="button"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          try { await onSave({ ...agent, systemPrompt: prompt }); }
          finally { setSaving(false); }
        }}
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Salvar prompt
      </button>
    </div>
  );
}

function MediaPreview({ message }: { readonly message: WhatsAppMessage }) {
  if (!message.mediaUrl) return null;
  if (message.messageType === "image") {
    return <img className="mb-2 max-h-48 w-full rounded-xl object-contain" src={message.mediaUrl} alt="" />;
  }
  if (message.messageType === "video") {
    return <video className="mb-2 max-h-48 w-full rounded-xl" src={message.mediaUrl} controls />;
  }
  if (message.messageType === "audio") {
    return <audio className="mb-2 w-full" src={message.mediaUrl} controls />;
  }
  return (
    <a className="mb-2 flex items-center gap-2 rounded-lg bg-black/10 px-3 py-2 text-xs underline" href={message.mediaUrl} target="_blank" rel="noreferrer">
      <FileUp className="h-4 w-4 shrink-0" />
      Abrir documento
    </a>
  );
}

// Suprime TS pelo uso interno sem impacto de runtime
const _unused = STATUS_LABEL;
void _unused;
