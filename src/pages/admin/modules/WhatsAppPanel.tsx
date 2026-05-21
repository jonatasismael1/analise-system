import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import {
  Bot, Calendar, CheckCheck, ChevronDown, FileUp,
  Loader2, MessageCircle, MessageSquarePlus, Mic, Phone,
  PlusCircle, RefreshCcw, Search, Send, Sparkles,
  Tag, UserPlus, UserRound, Users, Wifi, WifiOff, X,
} from "lucide-react";
import { askDeby } from "../../../services/debyService";
import { savePatientRecord } from "../../../services/patientService";
import {
  findOrCreateConversation,
  loadAiAgents,
  loadWhatsAppContacts,
  loadWhatsAppConversations,
  loadWhatsAppMessages,
  markConversationRead,
  saveAiAgent,
  saveConversationAiSettings,
  saveContactProfilePic,
  updateContactAtendimentoStatus,
  uploadMediaFile,
  upsertWhatsAppContact,
  type AiAgent,
  type AiMode,
  type AtendimentoStatus,
  type MessageType,
  type WhatsAppContactRecord,
  type WhatsAppConversation,
  type WhatsAppMessage,
} from "../../../services/evolutionService";
import {
  connectInstance,
  createInstance,
  DEFAULT_INSTANCE_NAME,
  fetchContactProfilePicture,
  getInstanceStatus,
  logoutInstance,
  sendWhatsAppMedia,
  sendWhatsAppText,
  setInstanceWebhook,
} from "../../../services/quickActionService";
import {
  createLeadFromConversation,
  loadLeadStages,
  loadLeads,
  type Lead,
  type LeadStage,
} from "../../../services/leadService";
import { Field, inputClass } from "../components/Field";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ConnStatus = "checking" | "disconnected" | "connecting" | "qr" | "connected";
type SidebarMode = "conversas" | "contatos";
type ConvFilter = "all" | "leads" | "ai" | "unread";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function msgTime(val: string | null) {
  if (!val) return "";
  const d = new Date(val);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function bestName(name: string | null | undefined, phone: string): string {
  return name?.trim() || phone;
}

function initials(name: string | null | undefined, phone: string): string {
  const src = name?.trim() || phone;
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

const ATENDIMENTO_LABEL: Record<AtendimentoStatus, string> = {
  novo: "Novo",
  ativo: "Lead ativo",
  paciente: "Paciente",
  arquivado: "Arquivado",
  humano: "Atendimento humano",
};

const ATENDIMENTO_STYLE: Record<AtendimentoStatus, string> = {
  novo: "bg-primary-wash text-primary-dark",
  ativo: "bg-warning-wash text-warning",
  paciente: "bg-success-wash text-success",
  arquivado: "bg-surface-low text-ink-muted",
  humano: "bg-danger-wash text-danger",
};

// ─── WhatsApp Logo ────────────────────────────────────────────────────────────

function WaLogo({ className = "h-5 w-5" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-[#25D366]`} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

function Shimmer({ className }: { readonly className: string }) {
  return (
    <div
      className={`animate-shimmer rounded ${className}`}
      style={{
        background: "linear-gradient(90deg, #EDF1F0 25%, #F3F6F5 50%, #EDF1F0 75%)",
        backgroundSize: "200% 100%",
      }}
    />
  );
}

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border-divider px-4 py-3.5">
      <Shimmer className="h-11 w-11 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <Shimmer className="h-3.5 w-32" />
          <Shimmer className="h-3 w-10" />
        </div>
        <Shimmer className="h-3 w-48" />
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  contact,
  size = "md",
}: {
  readonly contact: WhatsAppConversation["contact"] | { name: string | null; phone: string; profilePicUrl: string | null; pushName?: string | null };
  readonly size?: "xs" | "sm" | "md" | "lg";
}) {
  const cls =
    size === "lg" ? "h-16 w-16 text-xl"
    : size === "sm" ? "h-9 w-9 text-xs"
    : size === "xs" ? "h-7 w-7 text-[10px]"
    : "h-11 w-11 text-sm";

  if (contact.profilePicUrl) {
    return (
      <img
        className={`${cls} shrink-0 rounded-full object-cover ring-2 ring-border`}
        src={contact.profilePicUrl}
        alt=""
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-primary-wash font-bold text-primary-dark`}>
      {initials(contact.name, contact.phone)}
    </div>
  );
}

// ─── Toggle de IA ─────────────────────────────────────────────────────────────

function AiToggle({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  readonly label: string;
  readonly description?: string;
  readonly checked: boolean;
  readonly onChange: (v: boolean) => void;
  readonly icon?: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border-strong bg-surface px-3 py-2.5 transition hover:border-primary/40">
      <div className="flex items-start gap-2.5">
        {icon && <span className="mt-0.5 text-ink-secondary">{icon}</span>}
        <div>
          <span className="block text-[13px] font-medium text-ink">{label}</span>
          {description && <span className="block text-[11px] text-ink-muted">{description}</span>}
        </div>
      </div>
      <div className="relative mt-0.5 shrink-0">
        <input className="sr-only" type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className={`h-5 w-9 rounded-full transition-colors duration-200 ${checked ? "bg-primary" : "bg-border-strong"}`} />
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
    </label>
  );
}

// ─── ConversationItem ─────────────────────────────────────────────────────────

function ConversationItem({
  conversation,
  selected,
  onClick,
}: {
  readonly conversation: WhatsAppConversation;
  readonly selected: boolean;
  readonly onClick: () => void;
}) {
  const name = bestName(conversation.contact.name, conversation.contact.phone);
  const hasUnread = conversation.unreadCount > 0;

  return (
    <button
      className={`group flex w-full items-center gap-3 border-b border-border-divider px-4 py-3.5 text-left transition-all duration-150 ${
        selected
          ? "border-l-[3px] border-l-primary bg-primary-wash"
          : "hover:bg-surface-low"
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="relative shrink-0">
        <Avatar contact={conversation.contact} />
        {conversation.aiSettings?.aiEnabled && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-2 ring-white">
            <Bot className="h-2.5 w-2.5 text-white" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-2">
          <span className={`truncate text-[13.5px] ${hasUnread ? "font-bold text-ink" : "font-medium text-ink"}`}>
            {name}
          </span>
          <span className={`shrink-0 font-mono text-[11px] ${hasUnread ? "text-primary font-semibold" : "text-ink-muted"}`}>
            {msgTime(conversation.lastMessageAt)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <p className={`flex-1 truncate text-xs ${hasUnread ? "text-ink-secondary font-medium" : "text-ink-muted"}`}>
            {conversation.lastMessage ?? "Sem mensagens"}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {conversation.leadId && (
              <span className="h-1.5 w-1.5 rounded-full bg-warning" title="Lead" />
            )}
            {hasUnread && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>

        {conversation.atendimentoStatus !== "novo" && (
          <span className={`mt-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ATENDIMENTO_STYLE[conversation.atendimentoStatus]}`}>
            {ATENDIMENTO_LABEL[conversation.atendimentoStatus]}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── ContactItem ──────────────────────────────────────────────────────────────

function ContactItem({
  contact,
  onStartConversation,
}: {
  readonly contact: WhatsAppContactRecord;
  readonly onStartConversation: () => void;
}) {
  const name = bestName(contact.nome ?? contact.pushName, contact.telefone);
  return (
    <div className="flex items-center gap-3 border-b border-border-divider px-4 py-3 transition hover:bg-surface-low">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-wash text-sm font-bold text-primary-dark">
        {contact.profilePicUrl ? (
          <img className="h-10 w-10 rounded-full object-cover" src={contact.profilePicUrl} alt="" />
        ) : (
          initials(contact.nome ?? contact.pushName, contact.telefone)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">{name}</p>
        <p className="font-mono text-xs text-ink-muted">{contact.telefone}</p>
      </div>
      <button
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong text-ink-secondary transition hover:border-primary hover:bg-primary-wash hover:text-primary"
        title="Iniciar conversa"
        type="button"
        onClick={onStartConversation}
      >
        <MessageCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { readonly message: WhatsAppMessage }) {
  const isOut = message.direction === "out";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"} animate-fade-in`}>
      <div
        className={`relative max-w-[72%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
          isOut
            ? "rounded-br-sm bg-[#d9fdd3] text-[#111b21]"
            : "rounded-bl-sm bg-white text-[#111b21]"
        }`}
        style={{ wordBreak: "break-word" }}
      >
        {message.mediaUrl && <MediaPreview message={message} />}
        {message.content && (
          <p className="whitespace-pre-wrap text-[13.5px] leading-snug">{message.content}</p>
        )}
        <div className="mt-1 flex items-center justify-end gap-1">
          <span className="font-mono text-[10px] text-[#667781]">{msgTime(message.sentAt)}</span>
          {isOut && <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />}
        </div>
      </div>
    </div>
  );
}

function MediaPreview({ message }: { readonly message: WhatsAppMessage }) {
  if (!message.mediaUrl) return null;
  if (message.messageType === "image") {
    return (
      <img
        className="mb-2 max-h-52 w-full rounded-xl object-cover"
        src={message.mediaUrl}
        alt=""
      />
    );
  }
  if (message.messageType === "video") {
    return <video className="mb-2 max-h-52 w-full rounded-xl" src={message.mediaUrl} controls />;
  }
  if (message.messageType === "audio") {
    return <audio className="mb-2 w-full" src={message.mediaUrl} controls />;
  }
  return (
    <a
      className="mb-2 flex items-center gap-2 rounded-lg bg-black/10 px-3 py-2 text-xs underline transition hover:bg-black/20"
      href={message.mediaUrl}
      target="_blank"
      rel="noreferrer"
    >
      <FileUp className="h-4 w-4 shrink-0" />
      Abrir documento
    </a>
  );
}

// ─── Prompt Editor da Deby ────────────────────────────────────────────────────

function DebyPromptEditor({
  agent,
  onSave,
}: {
  readonly agent: AiAgent;
  readonly onSave: (a: AiAgent) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState(agent.systemPrompt);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border-strong">
      <button
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
        type="button"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-secondary">
          Prompt da Deby
        </span>
        <ChevronDown className={`h-4 w-4 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border-divider p-3 space-y-2">
          <textarea
            className={inputClass()}
            rows={5}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Você é a Deby, assistente da clínica..."
          />
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-ink-secondary hover:border-primary hover:text-primary disabled:opacity-60 transition"
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
      )}
    </div>
  );
}

// ─── Painel de Contato + IA ───────────────────────────────────────────────────

function ContactAiPanel({
  conversation,
  messages,
  lead,
  stages,
  debyAgent,
  loading,
  creatingPatient,
  onUpdateAiSettings,
  onUpdateAtendimento,
  onSummarize,
  onSuggestReply,
  onSaveAgent,
  onUseReply,
  onCreateLead,
  onCreatePatient,
}: {
  readonly conversation: WhatsAppConversation;
  readonly messages: WhatsAppMessage[];
  readonly lead: Lead | null;
  readonly stages: LeadStage[];
  readonly debyAgent: AiAgent | null;
  readonly loading: boolean;
  readonly creatingPatient: boolean;
  readonly onUpdateAiSettings: (v: { aiEnabled?: boolean; humanTakeover?: boolean; aiMode?: AiMode }) => Promise<void>;
  readonly onUpdateAtendimento: (s: AtendimentoStatus) => void;
  readonly onSummarize: () => void;
  readonly onSuggestReply: () => void;
  readonly onSaveAgent: (a: AiAgent) => Promise<void>;
  readonly onUseReply: (text: string) => void;
  readonly onCreateLead: () => void;
  readonly onCreatePatient: () => void;
}) {
  const name = bestName(conversation.contact.name, conversation.contact.phone);
  const ai = conversation.aiSettings;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Cabeçalho do contato */}
      <div className="flex flex-col items-center gap-2 border-b border-border-divider px-5 py-5 text-center">
        <Avatar contact={conversation.contact} size="lg" />
        <div>
          <h2 className="text-[15px] font-bold text-ink leading-tight">{name}</h2>
          <p className="mt-0.5 font-mono text-xs text-ink-muted">{conversation.contact.phone}</p>
        </div>
        {/* Badge de status */}
        <div className="flex flex-wrap justify-center gap-1.5">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${ATENDIMENTO_STYLE[conversation.atendimentoStatus]}`}>
            {ATENDIMENTO_LABEL[conversation.atendimentoStatus]}
          </span>
          {conversation.leadId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-wash px-2.5 py-1 text-[11px] font-semibold text-warning">
              <Tag className="h-3 w-3" />
              Lead
            </span>
          )}
        </div>
        {/* Seletor rápido de status */}
        <select
          className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-[12px] text-ink-secondary focus:border-primary focus:ring-1 focus:ring-primary/20"
          value={conversation.atendimentoStatus}
          onChange={e => onUpdateAtendimento(e.target.value as AtendimentoStatus)}
        >
          {(Object.keys(ATENDIMENTO_LABEL) as AtendimentoStatus[]).map(s => (
            <option key={s} value={s}>{ATENDIMENTO_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {/* Corpo scrollável */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">

        {/* CRM / Lead */}
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            CRM
          </p>
          {lead ? (
            <div className="rounded-lg border border-primary/20 bg-primary-wash p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-semibold text-primary-dark">{lead.nome}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  lead.temperatura === "quente" ? "bg-danger-wash text-danger"
                  : lead.temperatura === "morno" ? "bg-warning-wash text-warning"
                  : "bg-primary-wash text-primary"
                }`}>
                  {lead.temperatura}
                </span>
              </div>
              {stages.length > 0 && (
                <div className="mt-2 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[11px] text-ink-secondary">
                  {stages.find(s => s.id === lead.etapaId)?.nome ?? "Sem etapa"}
                </div>
              )}
              <p className="mt-2 text-center text-[10px] text-ink-muted">Gerencie no Kanban</p>
            </div>
          ) : (
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-[13px] font-medium text-ink-secondary transition hover:border-primary hover:bg-primary-wash hover:text-primary disabled:opacity-60"
              onClick={onCreateLead}
              disabled={loading}
              type="button"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
              Converter em Lead
            </button>
          )}

          <button
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-[13px] font-medium text-ink-secondary transition hover:border-success hover:bg-success-wash hover:text-success disabled:opacity-60"
            onClick={onCreatePatient}
            disabled={creatingPatient}
            type="button"
          >
            {creatingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Converter em Paciente
          </button>

          <button
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-[13px] font-medium text-ink-secondary transition hover:border-primary hover:bg-primary-wash hover:text-primary"
            type="button"
          >
            <Calendar className="h-4 w-4" />
            Criar agendamento
          </button>
        </section>

        {/* Deby AI */}
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            Deby AI
          </p>
          <div className="space-y-2">
            <AiToggle
              label="IA ativada"
              description="Deby responde automaticamente"
              checked={ai?.aiEnabled ?? false}
              onChange={checked => void onUpdateAiSettings({ aiEnabled: checked })}
              icon={<Bot className="h-4 w-4" />}
            />
            <AiToggle
              label="Atendimento humano"
              description="Pausa a IA nesta conversa"
              checked={ai?.humanTakeover ?? false}
              onChange={checked => void onUpdateAiSettings({ humanTakeover: checked })}
              icon={<UserRound className="h-4 w-4" />}
            />

            <Field label="Modo de operação">
              <select
                className={inputClass()}
                value={ai?.aiMode ?? "assisted"}
                onChange={e => void onUpdateAiSettings({ aiMode: e.target.value as AiMode })}
              >
                <option value="assisted">Assistido — sugere, humano aprova</option>
                <option value="automatic">Automático — responde direto</option>
              </select>
            </Field>

            {/* Ações de IA */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-surface px-2 py-2.5 text-[12px] font-medium text-ink-secondary transition hover:border-primary hover:bg-primary-wash hover:text-primary disabled:opacity-60"
                type="button"
                onClick={onSummarize}
                disabled={loading || messages.length === 0}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Resumir
              </button>
              <button
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-surface px-2 py-2.5 text-[12px] font-medium text-ink-secondary transition hover:border-primary hover:bg-primary-wash hover:text-primary disabled:opacity-60"
                type="button"
                onClick={onSuggestReply}
                disabled={loading || messages.length === 0}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                Sugerir
              </button>
            </div>

            {ai?.suggestedResponse && (
              <div className="rounded-lg border border-warning/30 bg-warning-wash p-3">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-warning">
                  Sugestão da Deby
                </p>
                <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink">
                  {ai.suggestedResponse}
                </p>
                <button
                  className="mt-2.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark"
                  type="button"
                  onClick={() => onUseReply(ai.suggestedResponse ?? "")}
                >
                  Usar resposta
                </button>
              </div>
            )}

            {debyAgent && (
              <DebyPromptEditor agent={debyAgent} onSave={onSaveAgent} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Empty State de conversa não selecionada ──────────────────────────────────

function NoConversationSelected() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-10">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#25D366]/10">
        <WaLogo className="h-10 w-10" />
      </div>
      <div className="text-center">
        <h3 className="text-[15px] font-semibold text-ink">WhatsApp Business</h3>
        <p className="mt-1 text-[13px] text-ink-secondary">
          Selecione uma conversa na lista ao lado para começar a atender.
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WhatsAppPanel — componente principal
// ══════════════════════════════════════════════════════════════════════════════

export function WhatsAppPanel({ clinicId }: { readonly clinicId: string }) {
  // ── Conexão ─────────────────────────────────────────────────────────────────
  const [connStatus, setConnStatus] = useState<ConnStatus>("checking");
  const [qr, setQr] = useState<{ code: string; b64: string | null } | null>(null);
  const [notice, setNotice] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);

  // ── Dados ────────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContactRecord[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);

  // ── UI ───────────────────────────────────────────────────────────────────────
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("conversas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ConvFilter>("all");
  const [search, setSearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [debyOutput, setDebyOutput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [newConvForm, setNewConvForm] = useState({ nome: "", telefone: "" });
  const [creatingConv, setCreatingConv] = useState(false);

  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const convPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendLockRef = useRef(false);

  // ── Derivados ─────────────────────────────────────────────────────────────────

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
    if (filter === "unread") list = list.filter(c => c.unreadCount > 0);
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(c =>
      `${c.contact.name ?? ""} ${c.contact.phone} ${c.lastMessage ?? ""}`.toLowerCase().includes(term)
    );
  }, [conversations, filter, search]);

  const filteredContacts = useMemo(() => {
    const term = contactSearch.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter(c =>
      `${c.nome ?? ""} ${c.pushName ?? ""} ${c.telefone}`.toLowerCase().includes(term)
    );
  }, [contacts, contactSearch]);

  const unreadTotal = useMemo(
    () => conversations.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0),
    [conversations]
  );

  // ── Loaders ──────────────────────────────────────────────────────────────────

  const loadInboxData = useCallback(async () => {
    setConvsLoading(true);
    try {
      const [convs, agts, ldsData, stgsData, ctts] = await Promise.all([
        loadWhatsAppConversations(clinicId).catch(() => [] as WhatsAppConversation[]),
        loadAiAgents(clinicId).catch(() => [] as AiAgent[]),
        loadLeads(clinicId).catch(() => [] as Lead[]),
        loadLeadStages(clinicId).catch(() => [] as LeadStage[]),
        loadWhatsAppContacts(clinicId, DEFAULT_INSTANCE_NAME).catch(() => [] as WhatsAppContactRecord[]),
      ]);
      setConversations(convs);
      setAgents(agts);
      setLeads(ldsData);
      setStages(stgsData);
      setContacts(ctts);
      setSelectedId(prev => prev ?? (convs[0]?.id ?? null));
    } finally {
      setConvsLoading(false);
    }
  }, [clinicId]);

  // ── Status inicial ────────────────────────────────────────────────────────────

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

  // ── Auto-refresh de conversas ────────────────────────────────────────────────

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

  // ── Carrega mensagens ao mudar conversa ──────────────────────────────────────

  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    setMessagesLoading(true);
    loadWhatsAppMessages(clinicId, selected.id)
      .then(msgs => setMessages(msgs))
      .catch(() => null)
      .finally(() => setMessagesLoading(false));

    // Marca como lido
    markConversationRead(clinicId, selected.id).catch(() => null);
  }, [clinicId, selected?.id]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Realtime ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (connStatus !== "connected") return;
    const channel = supabase
      .channel(`wa_msgs_${clinicId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "whatsapp_mensagens",
        filter: `clinica_id=eq.${clinicId}`,
      }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (row.conversa_id === selectedId) {
          setMessages(prev => {
            if (prev.some(m => m.id === (row.id as string))) return prev;
            return [...prev, {
              id: row.id as string,
              direction: (row.direcao === "out" ? "out" : "in") as "in" | "out",
              messageType: ((row.tipo as MessageType) ?? "text"),
              content: (row.texto as string | null) ?? null,
              mediaUrl: (row.media_url as string | null) ?? null,
              status: null,
              sentAt: row.enviada_em as string,
            }];
          });
        }
        loadWhatsAppConversations(clinicId)
          .then(convs => setConversations(convs))
          .catch(() => null);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [clinicId, connStatus, selectedId]);

  // ── Poll de mensagens (fallback) ──────────────────────────────────────────────

  useEffect(() => {
    stopMsgPoll();
    if (!selected || connStatus !== "connected") return;
    msgPollRef.current = setInterval(async () => {
      const msgs = await loadWhatsAppMessages(clinicId, selected.id).catch(() => null);
      if (msgs) setMessages(msgs);
    }, 15000);
    return stopMsgPoll;
  }, [clinicId, selected?.id, connStatus]);

  // ── Enriquecimento de foto (lazy, por conversa selecionada) ──────────────────

  useEffect(() => {
    if (!selected || connStatus !== "connected") return;
    const c = selected.contact;
    if (c.profilePicUrl) return; // já tem foto

    const phone = c.phone.replace(/\D/g, "");
    fetchContactProfilePicture(DEFAULT_INSTANCE_NAME, phone)
      .then(url => {
        if (!url) return;
        // Persiste no banco
        saveContactProfilePic(clinicId, selected.contactId, url).catch(() => null);
        // Atualiza UI localmente sem reload completo
        setConversations(prev =>
          prev.map(conv =>
            conv.id === selected.id
              ? { ...conv, contact: { ...conv.contact, profilePicUrl: url } }
              : conv
          )
        );
      })
      .catch(() => null);
  }, [selected?.id, connStatus]);

  // ── Helpers de poll ───────────────────────────────────────────────────────────

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
      } catch { /* continua */ }
    }, 5000);
  }

  // ── Ações de conexão ──────────────────────────────────────────────────────────

  async function handleConnect() {
    setConnStatus("connecting");
    setNotice(null);
    try {
      await createInstance(DEFAULT_INSTANCE_NAME).catch(() => null);
      setInstanceWebhook(DEFAULT_INSTANCE_NAME, clinicId).catch(() => null);
      const result = await connectInstance(DEFAULT_INSTANCE_NAME);
      const code = result.base64 || result.code;
      if (code) {
        setQr({ code, b64: result.base64 });
        setConnStatus("qr");
        startQrPolling();
      } else {
        await checkStatus();
      }
    } catch (e) {
      setConnStatus("disconnected");
      setNotice({ type: "error", text: e instanceof Error ? e.message : "Erro ao conectar." });
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Desconectar o WhatsApp da clínica?")) return;
    stopQrPoll(); stopMsgPoll();
    try { await logoutInstance(DEFAULT_INSTANCE_NAME); } catch { /* ignora */ }
    setQr(null);
    setConnStatus("disconnected");
    setConversations([]);
    setMessages([]);
    setSelectedId(null);
  }

  // ── Envio de mensagem ─────────────────────────────────────────────────────────

  async function handleSend() {
    if (!selected || (!reply.trim() && !file)) return;
    if (sendLockRef.current) return;
    sendLockRef.current = true;
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
          instanceName: DEFAULT_INSTANCE_NAME, phone,
          mediaUrl: uploadedMediaUrl, mediaType,
          caption: reply.trim(), fileName: file.name,
          mimeType: file.type || "application/octet-stream",
        });
      } else {
        await sendWhatsAppText(DEFAULT_INSTANCE_NAME, phone, textoEnviado);
      }

      const { data: inserted, error: insertErr } = await supabase
        .from("whatsapp_mensagens")
        .insert({
          clinica_id: clinicId,
          conversa_id: selected.id,
          contato_id: selected.contactId || null,
          direcao: "out",
          tipo: file ? mediaType : "text",
          texto: textoEnviado,
          media_url: uploadedMediaUrl,
          payload: {},
          enviada_em: nowIso,
        })
        .select("id")
        .single();

      const newMsg = {
        id: inserted?.id ?? `local-${Date.now()}`,
        direction: "out" as const,
        messageType: (file ? mediaType : "text") as MessageType,
        content: textoEnviado,
        mediaUrl: uploadedMediaUrl,
        status: null,
        sentAt: nowIso,
      };
      if (insertErr) {
        console.error("[WhatsApp] Erro ao salvar mensagem:", insertErr.message);
      }
      setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);

      await supabase.from("whatsapp_conversas")
        .update({ ultimo_texto: textoEnviado, ultima_mensagem_em: nowIso })
        .eq("id", selected.id).eq("clinica_id", clinicId);

      loadWhatsAppConversations(clinicId).then(setConversations).catch(() => null);
      setReply("");
      setFile(null);
    } catch (e) {
      setNotice({ type: "error", text: e instanceof Error ? e.message : "Erro ao enviar." });
    } finally {
      setSending(false);
      sendLockRef.current = false;
    }
  }

  // ── IA ────────────────────────────────────────────────────────────────────────

  async function handleAiAction(action: "whatsapp_summary" | "whatsapp_reply") {
    if (!selected || messages.length === 0) return;
    setAiLoading(true);
    try {
      const transcript = messages
        .map(m => `${m.direction === "in" ? "Contato" : "Clínica"}: ${m.content ?? `[${m.messageType}]`}`)
        .join("\n");
      const output = await askDeby({
        clinicId, action, module: "whatsapp",
        text: `Contato: ${selected.contact.name ?? selected.contact.phone}\nConversa:\n${transcript}`
      });
      if (action === "whatsapp_reply") setReply(output);
      else setDebyOutput(output);
    } catch (e) {
      setNotice({ type: "error", text: e instanceof Error ? e.message : "Erro na Deby AI." });
    } finally {
      setAiLoading(false);
    }
  }

  async function handleUpdateAiSettings(values: { aiEnabled?: boolean; humanTakeover?: boolean; aiMode?: AiMode }) {
    if (!selected) return;
    const cur = selected.aiSettings;
    await saveConversationAiSettings({
      clinicId, conversationId: selected.id,
      aiEnabled: values.aiEnabled ?? cur?.aiEnabled ?? false,
      agentId: cur?.agentId ?? debyAgent?.id ?? null,
      humanTakeover: values.humanTakeover ?? cur?.humanTakeover ?? false,
      aiMode: values.aiMode ?? cur?.aiMode ?? "assisted",
    });
    await loadInboxData();
  }

  function handleUpdateAtendimento(status: AtendimentoStatus) {
    if (!selected) return;
    updateContactAtendimentoStatus(clinicId, selected.id, status)
      .then(() => loadWhatsAppConversations(clinicId).then(setConversations))
      .catch(() => null);
  }

  // ── Lead / Paciente ────────────────────────────────────────────────────────────

  async function handleCreateLead() {
    if (!selected) return;
    setCreatingLead(true); setNotice(null);
    try {
      await createLeadFromConversation({
        clinicId, conversationId: selected.id,
        contactId: selected.contactId,
        name: bestName(selected.contact.name, selected.contact.phone),
        phone: selected.contact.phone,
        stageId: stages[0]?.id ?? null,
      });
      await loadInboxData();
      setNotice({ type: "success", text: "Lead criado e vinculado com sucesso!" });
    } catch (e) {
      setNotice({ type: "error", text: e instanceof Error ? e.message : "Erro ao criar lead." });
    } finally {
      setCreatingLead(false);
    }
  }

  async function handleCreatePatient() {
    if (!selected) return;
    setCreatingPatient(true); setNotice(null);
    try {
      const phone = selected.contact.phone.replace(/\D/g, "");
      const { error } = await savePatientRecord(clinicId, {
        id: "", clinicaId: clinicId,
        nome: bestName(selected.contact.name, selected.contact.phone),
        whatsapp: phone, status: "ativo", valorTotalGasto: 0,
      });
      if (error) throw error;
      setNotice({ type: "success", text: "Paciente criado! Acesse Pacientes para completar." });
    } catch (e) {
      setNotice({ type: "error", text: e instanceof Error ? e.message : "Erro ao criar paciente." });
    } finally {
      setCreatingPatient(false);
    }
  }

  async function handleStartConversation(contact: WhatsAppContactRecord) {
    try {
      const conv = await findOrCreateConversation(clinicId, contact.id, contact.chatId);
      const convs = await loadWhatsAppConversations(clinicId);
      setConversations(convs);
      setSelectedId(conv.id);
      setSidebarMode("conversas");
    } catch (e) {
      setNotice({ type: "error", text: e instanceof Error ? e.message : "Erro ao iniciar conversa." });
    }
  }

  async function handleCreateNewConversation() {
    if (!newConvForm.telefone.trim()) return;
    setCreatingConv(true); setNotice(null);
    try {
      const contact = await upsertWhatsAppContact(clinicId, {
        nome: newConvForm.nome.trim() || null,
        telefone: newConvForm.telefone.trim(),
      });
      await handleStartConversation(contact);
      const ctts = await loadWhatsAppContacts(clinicId, DEFAULT_INSTANCE_NAME);
      setContacts(ctts);
      setShowNewConvModal(false);
      setNewConvForm({ nome: "", telefone: "" });
    } catch (e) {
      setNotice({ type: "error", text: e instanceof Error ? e.message : "Erro ao criar conversa." });
    } finally {
      setCreatingConv(false);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card">

      {/* ── Header / barra de conexão ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border-strong/50 bg-surface px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25D366]/10">
            <WaLogo />
          </div>
          <div>
            <p className="text-[13.5px] font-bold text-ink">WhatsApp Business</p>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full transition-colors ${
                connStatus === "connected" ? "bg-success"
                : connStatus === "qr" || connStatus === "connecting" ? "animate-pulse bg-warning"
                : connStatus === "checking" ? "animate-pulse bg-primary"
                : "bg-border-strong"
              }`} />
              <span className="font-mono text-[11px] text-ink-muted">
                {connStatus === "checking" ? "Verificando..."
                : connStatus === "connecting" ? "Iniciando conexão..."
                : connStatus === "qr" ? "Aguardando leitura do QR Code"
                : connStatus === "connected"
                  ? `${DEFAULT_INSTANCE_NAME} · Conectado${unreadTotal > 0 ? ` · ${unreadTotal} não lida${unreadTotal > 1 ? "s" : ""}` : ""}`
                : `${DEFAULT_INSTANCE_NAME} · Desconectado`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connStatus === "connected" && (
            <>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong text-ink-muted transition hover:border-primary hover:text-primary"
                onClick={() => void loadInboxData()}
                title="Atualizar"
                type="button"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-[12px] font-medium text-ink-secondary transition hover:border-danger/50 hover:bg-danger-wash hover:text-danger"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-[12px] font-medium text-ink-secondary transition hover:border-primary hover:text-primary"
              onClick={() => void checkStatus()}
              type="button"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Verificar
            </button>
          )}
          {connStatus === "disconnected" && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#1ebe5d] active:-translate-y-px"
              onClick={() => void handleConnect()}
              type="button"
            >
              <Wifi className="h-3.5 w-3.5" />
              Conectar WhatsApp
            </button>
          )}
        </div>
      </div>

      {/* ── Aviso toast inline ──────────────────────────────────────────────────── */}
      {notice && (
        <div className={`flex items-center justify-between border-b px-5 py-2.5 text-[12px] ${
          notice.type === "error" ? "border-danger-border bg-danger-wash text-danger"
          : notice.type === "success" ? "border-success/20 bg-success-wash text-success"
          : "border-warning/20 bg-warning-wash text-warning"
        }`}>
          <p>{notice.text}</p>
          <button onClick={() => setNotice(null)} type="button" className="ml-4 shrink-0 opacity-60 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Estados de carregamento / conexão ──────────────────────────────────── */}

      {connStatus === "checking" && (
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-wash">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
            <p className="text-[13px] text-ink-secondary">Verificando conexão...</p>
          </div>
        </div>
      )}

      {connStatus === "connecting" && (
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366]/10">
              <Loader2 className="h-8 w-8 animate-spin text-[#25D366]" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-ink">Criando conexão...</p>
              <p className="mt-1 text-[13px] text-ink-secondary">Aguarde enquanto preparamos o QR Code.</p>
            </div>
          </div>
        </div>
      )}

      {connStatus === "qr" && qr && (
        <div className="flex min-h-[500px] items-center justify-center p-8">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366]/10">
              <WaLogo className="h-7 w-7" />
            </div>
            <h3 className="text-[17px] font-bold text-ink">Escaneie o QR Code</h3>
            <p className="mt-2 text-[13px] text-ink-secondary leading-relaxed">
              No WhatsApp, abra <strong>Configurações → Aparelhos conectados → Conectar aparelho</strong>
            </p>
            <div className="my-6 flex justify-center">
              {qr.b64 || qr.code.startsWith("data:") ? (
                <img
                  src={qr.b64 ?? qr.code}
                  alt="QR Code WhatsApp"
                  className="h-56 w-56 rounded-2xl border border-border bg-white p-3"
                />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-border bg-surface-low p-4 font-mono text-[10px] break-all text-center text-ink-muted">
                  {qr.code || "QR Code indisponível"}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 text-[12px] text-ink-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verificando automaticamente...
            </div>
            <button
              className="mt-4 w-full rounded-xl border border-border-strong py-2.5 text-[13px] font-medium text-ink-secondary transition hover:border-primary hover:text-primary"
              type="button"
              onClick={() => void checkStatus()}
            >
              Já escaniei — verificar agora
            </button>
            <button
              className="mt-2 text-[12px] text-ink-muted hover:text-ink-secondary"
              type="button"
              onClick={() => void handleConnect()}
            >
              Gerar novo QR Code
            </button>
          </div>
        </div>
      )}

      {connStatus === "disconnected" && (
        <div className="flex min-h-[500px] items-center justify-center p-8">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#25D366]/10">
              <WaLogo className="h-10 w-10" />
            </div>
            <h3 className="text-[20px] font-bold text-ink">Conecte o WhatsApp</h3>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">
              Clique no botão abaixo para conectar o WhatsApp da clínica.<br />
              Um QR Code será gerado para você escanear.
            </p>
            <button
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-[13.5px] font-bold text-white shadow-sm transition hover:bg-[#1ebe5d] active:scale-[0.98]"
              onClick={() => void handleConnect()}
              type="button"
            >
              <Wifi className="h-5 w-5" />
              Conectar WhatsApp
            </button>
            <p className="mt-3 font-mono text-[11px] text-ink-muted">
              Instância: {DEFAULT_INSTANCE_NAME}
            </p>
          </div>
        </div>
      )}

      {/* ── Inbox (conectado) ──────────────────────────────────────────────────── */}
      {connStatus === "connected" && (
        <div className="grid min-h-[660px] xl:grid-cols-[300px_minmax(0,1fr)_280px]">

          {/* ── Coluna esquerda: conversas / contatos ──────────────────────────── */}
          <aside className="flex flex-col border-r border-border-strong/40 bg-canvas">

            {/* Tabs */}
            <div className="flex border-b border-border-strong/40">
              {(["conversas", "contatos"] as const).map(mode => (
                <button
                  key={mode}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-[12px] font-semibold transition ${
                    sidebarMode === mode
                      ? "border-b-2 border-primary text-primary"
                      : "text-ink-secondary hover:text-ink"
                  }`}
                  onClick={() => setSidebarMode(mode)}
                  type="button"
                >
                  {mode === "conversas" ? <MessageCircle className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                  {mode === "conversas" ? "Conversas" : "Contatos"}
                  {mode === "conversas" && unreadTotal > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                      {unreadTotal}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Modo Conversas ─────────────────────────────────────────────── */}
            {sidebarMode === "conversas" && (
              <>
                <div className="border-b border-border-strong/40 p-3 space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                    <input
                      className="h-9 w-full rounded-lg border border-border-strong bg-surface pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      placeholder="Buscar conversas..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-1">
                    {(["all", "unread", "leads", "ai"] as ConvFilter[]).map(f => (
                      <button
                        key={f}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                          filter === f
                            ? "bg-primary text-white"
                            : "bg-surface text-ink-secondary hover:bg-primary-wash hover:text-primary"
                        }`}
                        onClick={() => setFilter(f)}
                        type="button"
                      >
                        {f === "all" ? "Todas" : f === "unread" ? "Não lidas" : f === "leads" ? "Leads" : "IA ativa"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {convsLoading ? (
                    Array.from({ length: 5 }, (_, i) => <ConversationSkeleton key={i} />)
                  ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-low">
                        <MessageCircle className="h-6 w-6 text-ink-muted" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-ink">
                          {conversations.length === 0 ? "Sem conversas ainda" : "Nenhuma conversa"}
                        </p>
                        <p className="mt-1 text-[12px] text-ink-muted">
                          {conversations.length === 0
                            ? "As mensagens chegam aqui automaticamente."
                            : "Nenhuma conversa com este filtro."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    filtered.map(conv => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        selected={selected?.id === conv.id}
                        onClick={() => { setSelectedId(conv.id); setDebyOutput(""); }}
                      />
                    ))
                  )}
                </div>

                <div className="border-t border-border-strong/40 p-3">
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-3 py-2 text-[12px] font-semibold text-ink-secondary transition hover:border-primary hover:bg-primary-wash hover:text-primary"
                    onClick={() => setShowNewConvModal(true)}
                    type="button"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                    Nova conversa
                  </button>
                </div>
              </>
            )}

            {/* ── Modo Contatos ──────────────────────────────────────────────── */}
            {sidebarMode === "contatos" && (
              <>
                <div className="border-b border-border-strong/40 p-3 space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                    <input
                      className="h-9 w-full rounded-lg border border-border-strong bg-surface pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      placeholder="Buscar contatos..."
                      value={contactSearch}
                      onChange={e => setContactSearch(e.target.value)}
                    />
                  </div>
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-primary-dark active:-translate-y-px"
                    onClick={() => setShowNewConvModal(true)}
                    type="button"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Novo contato
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-low">
                        <Users className="h-6 w-6 text-ink-muted" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-ink">Sem contatos</p>
                        <p className="mt-1 text-[12px] text-ink-muted">
                          Contatos aparecem automaticamente ao receber mensagens.
                        </p>
                      </div>
                    </div>
                  ) : (
                    filteredContacts.map(contact => (
                      <ContactItem
                        key={contact.id}
                        contact={contact}
                        onStartConversation={() => void handleStartConversation(contact)}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </aside>

          {/* ── Coluna central: mensagens ──────────────────────────────────────── */}
          <main className="flex flex-col bg-surface">
            {/* Header da conversa */}
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border-strong/40 bg-surface/95 px-4 backdrop-blur">
              {selected ? (
                <>
                  <Avatar contact={selected.contact} size="sm" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[13.5px] font-bold text-ink">
                      {bestName(selected.contact.name, selected.contact.phone)}
                    </h2>
                    <p className="font-mono text-[11px] text-ink-muted">{selected.contact.phone}</p>
                  </div>
                  {selected.leadId && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning-wash px-2.5 py-1 text-[10px] font-semibold text-warning">
                      <Tag className="h-3 w-3" />
                      Lead
                    </span>
                  )}
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${ATENDIMENTO_STYLE[selected.atendimentoStatus]}`}>
                    {ATENDIMENTO_LABEL[selected.atendimentoStatus]}
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-low">
                    <MessageCircle className="h-5 w-5 text-ink-muted" />
                  </div>
                  <span className="text-[13.5px] font-medium text-ink-secondary">Inbox</span>
                </div>
              )}
            </header>

            {/* Área de mensagens */}
            <div
              className="flex-1 overflow-y-auto p-4"
              style={{ background: "url('data:image/svg+xml,%3Csvg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"%23d1c8be\" fill-opacity=\"0.15\" fill-rule=\"evenodd\"%3E%3Ccircle cx=\"3\" cy=\"3\" r=\"1\"%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E') #e5ddd5" }}
            >
              {!selected ? (
                <NoConversationSelected />
              ) : messagesLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/60">
                    <MessageCircle className="h-6 w-6 text-ink-muted/60" />
                  </div>
                  <p className="text-[13px] text-ink-secondary">Nenhuma mensagem ainda.</p>
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

            {/* Footer: Deby output + input */}
            <footer className="shrink-0 border-t border-border-strong/40 bg-surface p-3 space-y-2">
              {debyOutput && (
                <div className="rounded-xl border border-primary/20 bg-primary-wash p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-primary">Deby AI</span>
                    </div>
                    <button className="text-ink-muted hover:text-ink" type="button" onClick={() => setDebyOutput("")}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{debyOutput}</p>
                </div>
              )}
              {file && (
                <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-low px-3 py-1.5 text-[12px] text-ink-secondary">
                  <FileUp className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <button type="button" onClick={() => setFile(null)}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <form
                className="flex items-center gap-2"
                onSubmit={e => { e.preventDefault(); void handleSend(); }}
              >
                <label className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-low hover:text-primary">
                  <PlusCircle className="h-5 w-5" />
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="flex flex-1 items-center gap-1 rounded-xl border border-border-strong bg-surface px-3 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition">
                  <input
                    className="flex-1 border-none bg-transparent py-1 text-[13.5px] text-ink placeholder:text-ink-muted focus:ring-0 focus:outline-none"
                    disabled={!selected}
                    placeholder={selected ? "Digite uma mensagem..." : "Selecione uma conversa..."}
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <button
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:text-primary"
                    type="button"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                </div>
                <button
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition hover:bg-primary-dark active:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={sending || !selected || (!reply.trim() && !file)}
                  type="submit"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </footer>
          </main>

          {/* ── Coluna direita: contato + IA ───────────────────────────────────── */}
          <aside className="hidden border-l border-border-strong/40 bg-canvas xl:flex xl:flex-col">
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
                onUpdateAtendimento={handleUpdateAtendimento}
                onSummarize={() => void handleAiAction("whatsapp_summary")}
                onSuggestReply={() => void handleAiAction("whatsapp_reply")}
                onSaveAgent={async a => { await saveAiAgent(clinicId, a); setAgents(await loadAiAgents(clinicId)); }}
                onUseReply={text => setReply(text)}
                onCreateLead={() => void handleCreateLead()}
                onCreatePatient={() => void handleCreatePatient()}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-low">
                    <UserRound className="h-7 w-7 text-ink-muted" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">Nenhum contato</p>
                    <p className="mt-1 text-[12px] text-ink-muted">Selecione uma conversa para ver os detalhes.</p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ── Modal nova conversa ────────────────────────────────────────────────── */}
      {showNewConvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm animate-fade-in rounded-xl bg-surface shadow-modal">
            <div className="flex items-center justify-between border-b border-border-divider px-5 py-4">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-primary" />
                <h3 className="text-[15px] font-bold text-ink">Nova conversa</h3>
              </div>
              <button
                className="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface-low hover:text-ink"
                type="button"
                onClick={() => setShowNewConvModal(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <Field label="Telefone (WhatsApp) *">
                <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition">
                  <Phone className="h-4 w-4 shrink-0 text-ink-muted" />
                  <input
                    className="flex-1 border-none bg-transparent text-[13.5px] text-ink placeholder:text-ink-muted focus:ring-0 focus:outline-none"
                    placeholder="Ex: 11999887766"
                    value={newConvForm.telefone}
                    onChange={e => setNewConvForm(prev => ({ ...prev, telefone: e.target.value }))}
                    type="tel"
                  />
                </div>
              </Field>
              <Field label="Nome (opcional)">
                <input
                  className={inputClass()}
                  placeholder="Nome do contato"
                  value={newConvForm.nome}
                  onChange={e => setNewConvForm(prev => ({ ...prev, nome: e.target.value }))}
                />
              </Field>
              <p className="text-[11px] text-ink-muted">
                O código do Brasil (+55) é adicionado automaticamente se não informado.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-border-divider px-5 py-4">
              <button
                className="rounded-lg border border-border-strong px-4 py-2 text-[13px] font-medium text-ink-secondary transition hover:bg-surface-low"
                type="button"
                onClick={() => setShowNewConvModal(false)}
              >
                Cancelar
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-primary-dark active:-translate-y-px disabled:opacity-50"
                disabled={creatingConv || !newConvForm.telefone.trim()}
                type="button"
                onClick={() => void handleCreateNewConversation()}
              >
                {creatingConv ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                Iniciar conversa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
