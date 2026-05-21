import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, RefreshCcw, Send, UserPlus, WifiOff, Wifi } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { askDeby } from "../../../services/debyService";
import { createLeadFromConversation, ensureDefaultStages, loadLeadStages, type LeadStage } from "../../../services/leadService";
import {
  connectWaha,
  disconnectWaha,
  getWahaQrCode,
  getWahaStatus,
  loadWhatsAppConversations,
  loadWhatsAppMessages,
  sendWhatsAppMessage,
  type WahaFrontendStatus,
  type WhatsAppConversation,
  type WhatsAppMessage
} from "../../../services/wahaService";
import { Field, inputClass } from "../components/Field";

// Intervalo de polling enquanto aguarda QR ou conexão (ms)
const POLL_INTERVAL_MS = 6000;

function messageTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function WhatsAppPanel({ clinicId }: { readonly clinicId: string }) {
  const [conversations, setConversations]   = useState<WhatsAppConversation[]>([]);
  const [messages, setMessages]             = useState<WhatsAppMessage[]>([]);
  const [selectedId, setSelectedId]         = useState<string | null>(null);
  const [wahaStatus, setWahaStatus]         = useState<WahaFrontendStatus>("disconnected");
  const [qrCode, setQrCode]                 = useState<string | null>(null);
  const [reply, setReply]                   = useState("");
  const [notice, setNotice]                 = useState<string | null>(null);
  const [debyOutput, setDebyOutput]         = useState("");
  const [stages, setStages]                 = useState<LeadStage[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isConnected = wahaStatus === "connected";
  const isStarting  = wahaStatus === "starting";
  const isQr        = wahaStatus === "qr_required";
  const isFailed    = wahaStatus === "failed";

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? conversations[0] ?? null,
    [conversations, selectedId]
  );

  // ── Polling ───────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Limpa polling ao desmontar o componente
  useEffect(() => { return stopPolling; }, [stopPolling]);

  // ── Dados ─────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setNotice(null);
    try {
      await ensureDefaultStages(clinicId);
      const [nextConversations, nextStages] = await Promise.all([
        loadWhatsAppConversations(clinicId),
        loadLeadStages(clinicId)
      ]);
      setConversations(nextConversations);
      setStages(nextStages);
      if (!selectedId && nextConversations[0]) setSelectedId(nextConversations[0].id);
    } catch {
      setNotice("Não foi possível carregar as conversas.");
    }
  }, [clinicId, selectedId]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    loadWhatsAppMessages(clinicId, selected.id)
      .then(setMessages)
      .catch(() => setNotice("Não foi possível carregar as mensagens."));
  }, [clinicId, selected]);

  // ── Verificar status ao montar ────────────────────────────────────────────
  // Se já estiver conectado (sessão persistiu no volume), mostra como conectado
  // sem precisar escanear QR novamente.
  useEffect(() => {
    getWahaStatus(clinicId)
      .then((result) => {
        setWahaStatus(result.status);
        if (result.status === "qr_required" && result.qr) setQrCode(result.qr);
      })
      .catch(() => {
        // Falha silenciosa: deixa em "disconnected"
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  // ── Conectar ──────────────────────────────────────────────────────────────

  async function handleConnect() {
    setNotice(null);
    setQrCode(null);

    try {
      const result = await connectWaha(clinicId);
      setWahaStatus(result.status);

      if (result.status === "connected") {
        await refresh();
        return;
      }

      if (result.status === "qr_required" && result.qr) {
        setQrCode(result.qr);
      }

      // Polling: atualiza status e QR até conectar ou falhar
      pollingRef.current = setInterval(async () => {
        try {
          const poll = await connectWaha(clinicId);
          setWahaStatus(poll.status);

          if (poll.status === "connected") {
            stopPolling();
            setQrCode(null);
            await refresh();
            return;
          }

          if (poll.status === "qr_required" && poll.qr) {
            setQrCode(poll.qr);
          } else if (poll.status === "starting") {
            // Aguardando inicialização — tenta buscar QR separadamente
            const qrResult = await getWahaQrCode(clinicId).catch(() => null);
            if (qrResult?.qr) setQrCode(qrResult.qr);
          } else if (poll.status === "failed") {
            stopPolling();
            setNotice("Não foi possível conectar o WhatsApp. Tente novamente em alguns instantes.");
          }
        } catch {
          // Ignora falhas transitórias no polling
        }
      }, POLL_INTERVAL_MS);

    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível conectar o WhatsApp. Tente novamente.");
    }
  }

  // ── Desconectar ───────────────────────────────────────────────────────────

  async function handleDisconnect() {
    stopPolling();
    try {
      await disconnectWaha(clinicId);
      setWahaStatus("disconnected");
      setQrCode(null);
      setNotice("WhatsApp desconectado com sucesso.");
    } catch {
      setNotice("Não foi possível desconectar. Tente novamente.");
    }
  }

  // ── Verificar manualmente ─────────────────────────────────────────────────

  async function handleCheckStatus() {
    try {
      const result = await getWahaStatus(clinicId);
      setWahaStatus(result.status);
      if (result.status === "qr_required" && result.qr) setQrCode(result.qr);
    } catch {
      setNotice("Não foi possível verificar a conexão.");
    }
  }

  // ── Enviar mensagem ───────────────────────────────────────────────────────

  async function handleSend() {
    if (!selected || !reply.trim()) return;
    try {
      await sendWhatsAppMessage({
        clinicId,
        conversaId: selected.id,
        contatoId: selected.contato.id,
        chatId: selected.chatId,
        text: reply.trim()
      });
      setReply("");
      await refresh();
      setMessages(await loadWhatsAppMessages(clinicId, selected.id));
    } catch {
      setNotice("Não foi possível enviar a mensagem. Verifique a conexão com o WhatsApp.");
    }
  }

  // ── Deby AI ───────────────────────────────────────────────────────────────

  async function summarizeConversation(action: "whatsapp_summary" | "whatsapp_reply") {
    if (!selected) return;
    const transcript = messages
      .map((m) => `${m.direcao === "in" ? "Contato" : "Equipe"}: ${m.texto ?? ""}`)
      .join("\n");
    const output = await askDeby({
      clinicId,
      action,
      module: "whatsapp",
      text: `Contato: ${selected.contato.nome ?? selected.contato.telefone}\nStatus: ${selected.status}\nConversa:\n${transcript}`
    });
    if (action === "whatsapp_reply") setReply(output);
    else setDebyOutput(output);
  }

  async function convertToLead() {
    if (!selected) return;
    const firstStage = stages[0]?.id ?? null;
    const summary = debyOutput || messages.slice(-5).map((m) => m.texto).filter(Boolean).join(" ");
    await createLeadFromConversation({
      clinicId,
      conversationId: selected.id,
      contactId: selected.contato.id,
      name: selected.contato.nome ?? selected.contato.telefone,
      phone: selected.contato.telefone,
      stageId: firstStage,
      summary
    });
    setNotice("Conversa enviada para o Kanban de leads.");
    await refresh();
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  function ConnectionBadge() {
    if (isConnected) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          <Wifi className="h-3.5 w-3.5" />
          WhatsApp conectado
        </span>
      );
    }
    if (isStarting) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Preparando conexão...
        </span>
      );
    }
    if (isQr) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Aguardando escaneamento...
        </span>
      );
    }
    if (isFailed) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
          <WifiOff className="h-3.5 w-3.5" />
          Falha na conexão
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-variant bg-surface-container-low px-3 py-1 text-sm font-medium text-secondary">
        <WifiOff className="h-3.5 w-3.5" />
        Desconectado
      </span>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Seção de conexão ── */}
      <SectionCard title="Conexão WhatsApp" description="Conecte o número da clínica para enviar e receber mensagens.">
        <div className="flex flex-wrap items-center gap-3">
          <ConnectionBadge />

          {/* Botão Conectar: visível quando desconectado ou falhou */}
          {!isConnected && !isStarting && !isQr ? (
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition"
              type="button"
              onClick={() => void handleConnect()}
            >
              Conectar WhatsApp
            </button>
          ) : null}

          {/* Botão Desconectar: visível apenas quando conectado */}
          {isConnected ? (
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-error px-4 py-2 text-sm font-medium text-error hover:bg-red-50 transition"
              type="button"
              onClick={() => void handleDisconnect()}
            >
              Desconectar
            </button>
          ) : null}

          <button
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium hover:border-primary hover:text-primary"
            type="button"
            onClick={() => void handleCheckStatus()}
          >
            <RefreshCcw className="h-4 w-4" />
            Verificar conexão
          </button>

          <button
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium hover:border-primary hover:text-primary"
            type="button"
            onClick={() => void refresh()}
          >
            <RefreshCcw className="h-4 w-4" />
            Atualizar conversas
          </button>
        </div>

        {/* QR Code */}
        {isQr && qrCode ? (
          <div className="mt-4 flex flex-col items-start gap-2">
            <p className="text-sm font-medium text-on-surface">
              Abra o WhatsApp no celular → <strong>Aparelhos conectados</strong> → <strong>Conectar aparelho</strong>
            </p>
            <img
              src={qrCode}
              alt="QR Code WhatsApp"
              className="h-52 w-52 rounded-lg border border-surface-variant shadow-sm"
            />
            <p className="text-xs text-secondary">
              Escaneie o QR Code pelo WhatsApp para conectar.
              O código é atualizado automaticamente a cada {POLL_INTERVAL_MS / 1000} segundos.
            </p>
          </div>
        ) : null}

        {/* Aguardando QR aparecer (STARTING sem QR ainda) */}
        {isStarting && !qrCode ? (
          <p className="mt-3 text-sm text-secondary animate-pulse">
            Preparando a conexão com o WhatsApp, aguarde...
          </p>
        ) : null}

        {/* Aviso de erro amigável */}
        {isFailed ? (
          <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            Não foi possível conectar o WhatsApp. Tente novamente em alguns instantes.
          </p>
        ) : null}

        {/* Notificações gerais (sucesso / erros não críticos) */}
        {notice ? (
          <p className="mt-3 rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 text-sm text-secondary">
            {notice}
          </p>
        ) : null}
      </SectionCard>

      {/* ── Conversas e atendimento ── */}
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <SectionCard title="Conversas">
          {conversations.length === 0 ? (
            <EmptyState
              title="Nenhuma conversa"
              message="As mensagens recebidas aparecerão aqui após o WhatsApp ser conectado."
            />
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <button
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selected?.id === conversation.id
                      ? "border-primary bg-teal-50"
                      : "border-surface-variant bg-white hover:border-primary/40"
                  }`}
                  key={conversation.id}
                  onClick={() => {
                    setSelectedId(conversation.id);
                    setDebyOutput("");
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">
                        {conversation.contato.nome ?? conversation.contato.telefone}
                      </p>
                      <p className="mt-0.5 text-xs text-secondary">
                        {messageTime(conversation.ultimaMensagemEm)}
                      </p>
                    </div>
                    {conversation.leadId ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                        Lead
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-secondary">
                    {conversation.ultimoTexto ?? "Sem texto"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title={selected ? `Atendimento: ${selected.contato.nome ?? selected.contato.telefone}` : "Atendimento"}>
          {!selected ? (
            <EmptyState title="Selecione uma conversa" message="Abra uma conversa para responder ou transformar em lead." />
          ) : (
            <div className="space-y-4">
              {/* Histórico de mensagens */}
              <div className="h-[420px] space-y-2 overflow-y-auto rounded-lg border border-surface-variant bg-surface-container-low p-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-secondary">Nenhuma mensagem nesta conversa.</p>
                ) : null}
                {messages.map((message) => (
                  <div
                    className={`flex ${message.direcao === "out" ? "justify-end" : "justify-start"}`}
                    key={message.id}
                  >
                    <div className={`max-w-[78%] rounded-lg px-3 py-2 text-sm ${
                      message.direcao === "out"
                        ? "bg-primary text-white"
                        : "border border-surface-variant bg-white text-on-surface"
                    }`}>
                      <p className="whitespace-pre-wrap">{message.texto}</p>
                      <p className={`mt-1 text-[10px] ${message.direcao === "out" ? "text-white/75" : "text-secondary"}`}>
                        {messageTime(message.enviadaEm)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ações Deby AI e Kanban */}
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium hover:border-primary hover:text-primary"
                  type="button"
                  onClick={() => void summarizeConversation("whatsapp_summary")}
                >
                  <Bot className="h-4 w-4" />
                  Resumir conversa
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium hover:border-primary hover:text-primary"
                  type="button"
                  onClick={() => void summarizeConversation("whatsapp_reply")}
                >
                  <Bot className="h-4 w-4" />
                  Sugerir resposta
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium hover:border-primary hover:text-primary disabled:opacity-50"
                  type="button"
                  disabled={Boolean(selected.leadId)}
                  onClick={() => void convertToLead()}
                >
                  <UserPlus className="h-4 w-4" />
                  Enviar para Kanban
                </button>
              </div>

              {debyOutput ? (
                <div className="whitespace-pre-wrap rounded-lg border border-teal-100 bg-teal-50 p-3 text-sm text-teal-950">
                  {debyOutput}
                </div>
              ) : null}

              {/* Formulário de envio */}
              <form
                className="grid gap-3 md:grid-cols-[1fr_auto]"
                onSubmit={(e) => { e.preventDefault(); void handleSend(); }}
              >
                <Field label="Mensagem">
                  <textarea
                    className={inputClass()}
                    rows={3}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                </Field>
                <button
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark"
                  type="submit"
                >
                  <Send className="h-4 w-4" />
                  Enviar
                </button>
              </form>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
