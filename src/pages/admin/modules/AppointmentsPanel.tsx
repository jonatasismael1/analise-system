import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleX,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  List,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  Video,
  X,
} from "lucide-react";
import {
  buildTeleconsultaMessage,
  createTeleconsultaRoom,
  getTeleconsultaByAppointment,
  markLinkSent,
  TELECONSULTA_STATUS_LABEL,
  type TeleconsultaData,
} from "../../../services/teleconsultaService";
import { DEFAULT_INSTANCE_NAME, sendWhatsAppText } from "../../../services/quickActionService";
import type { UserRole } from "../../../types/clinic";
import { ClinicCalendar } from "../components/ClinicCalendar";
import { ProgramBadge } from "../../../components/ui/ProgramBadge";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
import { todayISO } from "../../../lib/formatters";
import { buildRecurringDates, type RecurrenceFrequency } from "../../../services/appointmentService";
import type { Appointment, Patient, PatientProgramMembership, Professional, Service } from "../../../types/clinic";
import type { ProgramaDesconto } from "./DiscountProgramsPanel";
import { Field, inputClass } from "../components/Field";
import { Pagination, usePagination } from "../components/Pagination";

// ── Status badge ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Appointment["status"], { label: string; cls: string }> = {
  confirmado: { label: "Confirmado", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pendente:   { label: "Pendente",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  concluido:  { label: "Concluído",  cls: "bg-blue-50 text-blue-700 border-blue-200" },
  cancelado:  { label: "Cancelado",  cls: "bg-slate-100 text-slate-500 border-slate-200" },
  faltou:     { label: "Faltou",     cls: "bg-red-50 text-red-600 border-red-200" },
};

function ApptStatus({ status }: { readonly status: Appointment["status"] }) {
  const { label, cls } = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendente;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

// ── Patient autocomplete ─────────────────────────────────────────────────────

function PatientSearch({
  patients,
  selectedId,
  onSelect,
}: {
  readonly patients: Patient[];
  readonly selectedId: string;
  readonly onSelect: (id: string, nome: string, whatsapp: string) => void;
}) {
  const selected = patients.find((p) => p.id === selectedId);
  const [query, setQuery] = useState(selected?.nome ?? "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? patients.filter((p) =>
        `${p.nome} ${p.cpf ?? ""} ${p.whatsapp ?? ""}`.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : patients.slice(0, 8);

  function pick(p: Patient) {
    setQuery(p.nome);
    setOpen(false);
    onSelect(p.id, p.nome, p.whatsapp ?? "");
  }

  function handleBlur(e: React.FocusEvent) {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
  }

  return (
    <div ref={ref} className="relative" onBlur={handleBlur}>
      <input
        className={inputClass()}
        placeholder="Buscar por nome, CPF ou WhatsApp..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect("", "", ""); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-white shadow-modal">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                className="flex w-full flex-col px-3 py-2 text-left text-[13px] hover:bg-surface-low transition"
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              >
                <span className="font-medium text-ink">{p.nome}</span>
                {(p.whatsapp || p.cpf) && (
                  <span className="text-[11px] text-ink-muted">
                    {[p.whatsapp, p.cpf].filter(Boolean).join(" · ")}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Form defaults ────────────────────────────────────────────────────────────

const EMPTY_FORM = (professionals: Professional[], services: Service[]) => ({
  id: "",
  profissionalId: professionals[0]?.id ?? "",
  servicoId: services[0]?.id ?? "",
  pacienteId: "",
  pacienteNome: "",
  pacienteWhatsapp: "",
  data: todayISO(),
  horario: "09:00",
  status: "confirmado" as Appointment["status"],
  tipoAtendimento: "presencial" as "presencial" | "teleconsulta",
  recorrenciaFrequency: "none" as RecurrenceFrequency,
  recorrenciaOccurrences: 4,
});

// ── Main panel ────────────────────────────────────────────────────────────────

export function AppointmentsPanel({
  clinicId,
  role,
  appointments,
  patients,
  professionals,
  services,
  memberships = [],
  programas = [],
  onSave,
  onDelete,
  onDeleteSeries,
}: {
  readonly clinicId: string;
  readonly role?: UserRole | null;
  readonly appointments: Appointment[];
  readonly patients: Patient[];
  readonly professionals: Professional[];
  readonly services: Service[];
  readonly memberships?: PatientProgramMembership[];
  readonly programas?: ProgramaDesconto[];
  readonly onSave: (values: {
    id?: string;
    profissionalId: string;
    servicoId?: string | null;
    pacienteId?: string | null;
    pacienteNome: string;
    pacienteWhatsapp: string;
    data: string;
    horario: string;
    status: Appointment["status"];
    tipoAtendimento?: "presencial" | "teleconsulta";
    recorrencia?: { frequency: RecurrenceFrequency; occurrences: number };
  }) => Promise<boolean>;
  readonly onDelete: (id: string) => Promise<void>;
  readonly onDeleteSeries: (recorrenciaId: string) => Promise<void>;
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"lista" | "calendario">("lista");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerForm, setDrawerForm] = useState(() => EMPTY_FORM(professionals, services));
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "todos",
    profissionalId: "todos",
    date: "",
    servicoId: "todos",
    patientType: "todos",
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // ── Teleconsulta state ─────────────────────────────────────────────────────
  const [teleconsulta, setTeleconsulta] = useState<TeleconsultaData | null>(null);
  const [loadingTele, setLoadingTele] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [teleError, setTeleError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendingWpp, setSendingWpp] = useState(false);
  const [wppSent, setWppSent] = useState(false);

  useEffect(() => {
    if (!drawerOpen || !drawerForm.id || drawerForm.tipoAtendimento !== "teleconsulta") {
      setTeleconsulta(null);
      setTeleError(null);
      return;
    }
    setLoadingTele(true);
    void getTeleconsultaByAppointment(drawerForm.id)
      .then((data) => setTeleconsulta(data))
      .finally(() => setLoadingTele(false));
  }, [drawerOpen, drawerForm.id, drawerForm.tipoAtendimento]);

  function updateFilter(next: Partial<typeof filters>) {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(0);
  }

  // ── Summary cards (based on full list, not filtered) ──────────────────────
  const summary = useMemo(() => {
    const today = todayISO();
    return {
      today: appointments.filter((a) => a.data === today && a.status !== "cancelado").length,
      confirmed: appointments.filter((a) => a.status === "confirmado").length,
      pending: appointments.filter((a) => a.status === "pendente").length,
      cancelled: appointments.filter((a) => a.status === "cancelado").length,
    };
  }, [appointments]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filteredAppointments = useMemo(() =>
    appointments
      .filter((a) => {
        const profName = professionals.find((p) => p.id === filters.profissionalId)?.nome;
        const patientCpf = a.pacienteId ? (patients.find((p) => p.id === a.pacienteId)?.cpf ?? "") : "";
        const matchSearch = `${a.pacienteNome} ${a.profissional} ${a.servico} ${patientCpf}`.toLowerCase().includes(filters.search.toLowerCase());
        const matchStatus = filters.status === "todos" || a.status === filters.status;
        const matchProf = filters.profissionalId === "todos" || a.profissional === profName;
        const matchDate = !filters.date || a.data === filters.date;
        const matchService = filters.servicoId === "todos" || a.servicoId === filters.servicoId;
        const matchType =
          filters.patientType === "todos" ||
          (filters.patientType === "cadastrado" && Boolean(a.pacienteId)) ||
          (filters.patientType === "avulso" && !a.pacienteId);
        return matchSearch && matchStatus && matchProf && matchDate && matchService && matchType;
      })
      .sort((a, b) => `${b.data} ${b.horario}`.localeCompare(`${a.data} ${a.horario}`)),
  [appointments, filters, professionals]);

  const paginatedAppointments = usePagination(filteredAppointments, page, pageSize);

  // ── Recurrence ─────────────────────────────────────────────────────────────
  const recurrenceDates = useMemo(() => {
    if (drawerForm.id || drawerForm.recorrenciaFrequency === "none") return [drawerForm.data];
    return buildRecurringDates(drawerForm.data, drawerForm.recorrenciaFrequency, drawerForm.recorrenciaOccurrences);
  }, [drawerForm.data, drawerForm.id, drawerForm.recorrenciaFrequency, drawerForm.recorrenciaOccurrences]);

  const recurrenceConflicts = useMemo(() => {
    if (drawerForm.id || drawerForm.recorrenciaFrequency === "none") return [];
    return recurrenceDates.filter((date) =>
      appointments.some(
        (a) =>
          a.profissionalId === drawerForm.profissionalId &&
          a.data === date &&
          a.horario === drawerForm.horario &&
          a.status !== "cancelado"
      )
    );
  }, [appointments, drawerForm, recurrenceDates]);

  // ── Drawer helpers ─────────────────────────────────────────────────────────
  function openCreate() {
    setDrawerForm(EMPTY_FORM(professionals, services));
    setLocalError(null);
    setDrawerOpen(true);
  }

  function openEdit(appointment: Appointment) {
    setDrawerForm({
      id: appointment.id,
      profissionalId: professionals.find((p) => p.nome === appointment.profissional)?.id ?? "",
      servicoId: appointment.servicoId ?? services[0]?.id ?? "",
      pacienteId: appointment.pacienteId ?? "",
      pacienteNome: appointment.pacienteNome,
      pacienteWhatsapp: appointment.pacienteWhatsapp ?? "",
      data: appointment.data,
      horario: appointment.horario,
      status: appointment.status,
      tipoAtendimento: appointment.tipoAtendimento ?? "presencial",
      recorrenciaFrequency: "none",
      recorrenciaOccurrences: 4,
    });
    setLocalError(null);
    setDrawerOpen(true);
  }

  async function handleCreateRoom() {
    if (!drawerForm.id) return;
    setCreatingRoom(true);
    setTeleError(null);
    try {
      const [year, month, day] = drawerForm.data.split("-").map(Number);
      const [hour, minute] = drawerForm.horario.split(":").map(Number);
      const startDate = new Date(year, month - 1, day, hour, minute);
      const durationMin = services.find((s) => s.id === drawerForm.servicoId)?.duracaoMin ?? 60;
      const appointmentEndMs = startDate.getTime() + (durationMin + 30) * 60 * 1000;
      // Whereby exige endDate no futuro — se o agendamento já passou, usa agora + 31 min
      const endDate = new Date(Math.max(appointmentEndMs, Date.now() + 31 * 60 * 1000));

      const professionalId = professionals.find((p) => p.id === drawerForm.profissionalId)?.id ?? null;

      await createTeleconsultaRoom({
        clinicId,
        appointmentId: drawerForm.id,
        patientId: drawerForm.pacienteId || null,
        professionalId,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      });

      const refreshed = await getTeleconsultaByAppointment(drawerForm.id);
      setTeleconsulta(refreshed);
    } catch (e: unknown) {
      setTeleError((e as { message?: string })?.message ?? "Erro ao criar sala. Tente novamente.");
    } finally {
      setCreatingRoom(false);
    }
  }

  async function handleCopyPatientLink() {
    if (!teleconsulta?.patientAccessUrl) return;
    await navigator.clipboard.writeText(teleconsulta.patientAccessUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendWhatsApp() {
    if (!teleconsulta?.patientAccessUrl || !drawerForm.pacienteWhatsapp) return;
    setSendingWpp(true);
    setTeleError(null);
    try {
      const profissional = professionals.find((p) => p.id === drawerForm.profissionalId);
      const message = buildTeleconsultaMessage({
        patientName: drawerForm.pacienteNome,
        professionalName: profissional?.nome ?? "Profissional",
        date: drawerForm.data,
        time: drawerForm.horario,
        accessUrl: teleconsulta.patientAccessUrl,
      });
      const phone = drawerForm.pacienteWhatsapp.replace(/\D/g, "");
      await sendWhatsAppText(DEFAULT_INSTANCE_NAME, phone, message);
      void markLinkSent(teleconsulta.id);
      setTeleconsulta((prev) => prev ? { ...prev, status: "link_enviado", linkSentAt: new Date().toISOString() } : prev);
      setWppSent(true);
      setTimeout(() => setWppSent(false), 3000);
    } catch (e: unknown) {
      setTeleError((e as { message?: string })?.message ?? "Erro ao enviar mensagem pelo WhatsApp.");
    } finally {
      setSendingWpp(false);
    }
  }

  function handleEnterAsProfessional() {
    if (!teleconsulta) return;
    const url = teleconsulta.wherebyHostRoomUrl ?? teleconsulta.wherebyRoomUrl;
    if (url) window.open(url, "_blank");
  }

  async function handleSubmit() {
    setLocalError(null);
    if (!drawerForm.profissionalId) { setLocalError("Selecione um profissional."); return; }
    if ((drawerForm.pacienteNome || "").trim().length < 3) { setLocalError("Informe o nome do paciente (mín. 3 caracteres)."); return; }
    if (!drawerForm.id && drawerForm.recorrenciaFrequency !== "none" && recurrenceConflicts.length > 0) {
      setLocalError(`Conflito nos dias: ${recurrenceConflicts.slice(0, 3).map((d) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR")).join(", ")}.`);
      return;
    }
    setSaving(true);
    try {
      const ok = await onSave({
        id: drawerForm.id || undefined,
        profissionalId: drawerForm.profissionalId,
        servicoId: drawerForm.servicoId || null,
        pacienteId: drawerForm.pacienteId || null,
        pacienteNome: drawerForm.pacienteNome.trim() || "Paciente",
        pacienteWhatsapp: drawerForm.pacienteWhatsapp,
        data: drawerForm.data,
        horario: drawerForm.horario,
        status: drawerForm.status,
        tipoAtendimento: drawerForm.tipoAtendimento,
        recorrencia: drawerForm.id ? undefined : { frequency: drawerForm.recorrenciaFrequency, occurrences: drawerForm.recorrenciaOccurrences },
      });
      if (ok) setDrawerOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelAppointment() {
    if (!drawerForm.id) return;
    setSaving(true);
    try {
      const ok = await onSave({
        id: drawerForm.id,
        profissionalId: drawerForm.profissionalId,
        servicoId: drawerForm.servicoId || null,
        pacienteId: drawerForm.pacienteId || null,
        pacienteNome: drawerForm.pacienteNome.trim() || "Paciente",
        pacienteWhatsapp: drawerForm.pacienteWhatsapp,
        data: drawerForm.data,
        horario: drawerForm.horario,
        status: "cancelado",
      });
      if (ok) setDrawerOpen(false);
    } finally {
      setSaving(false);
    }
  }

  // ── Active filter count ────────────────────────────────────────────────────
  const activeFilterCount = [
    filters.search,
    filters.status !== "todos" ? filters.status : "",
    filters.profissionalId !== "todos" ? filters.profissionalId : "",
    filters.date,
  ].filter(Boolean).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Barra de ação topo ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-secondary">
          Gerencie os horários, profissionais e status dos atendimentos.
        </p>
        <button
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark active:-translate-y-px"
          type="button"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" />
          Novo agendamento
        </button>
      </div>

      {/* ── Filtros ────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-border bg-white p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <input
              className={inputClass()}
              placeholder="Buscar por nome, CPF, profissional..."
              value={filters.search}
              onChange={(e) => updateFilter({ search: e.target.value })}
            />
          </div>
          <input
            className={inputClass()}
            type="date"
            value={filters.date}
            onChange={(e) => updateFilter({ date: e.target.value })}
          />
          <select
            className={inputClass()}
            value={filters.profissionalId}
            onChange={(e) => updateFilter({ profissionalId: e.target.value })}
          >
            <option value="todos">Todos os profissionais</option>
            {professionals.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select
            className={inputClass()}
            value={filters.status}
            onChange={(e) => updateFilter({ status: e.target.value })}
          >
            <option value="todos">Todos os status</option>
            <option value="confirmado">Confirmado</option>
            <option value="pendente">Pendente</option>
            <option value="concluido">Concluído</option>
            <option value="faltou">Faltou</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        {/* Mais filtros */}
        <button
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-secondary transition hover:text-primary"
          type="button"
          onClick={() => setShowMoreFilters(!showMoreFilters)}
        >
          {showMoreFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showMoreFilters ? "Ocultar filtros" : "Mais filtros"}
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{activeFilterCount}</span>
          )}
        </button>

        {showMoreFilters && (
          <div className="mt-3 grid gap-3 border-t border-border-divider pt-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">Serviço</label>
              <select
                className={inputClass()}
                value={filters.servicoId}
                onChange={(e) => updateFilter({ servicoId: e.target.value })}
              >
                <option value="todos">Todos os serviços</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">Tipo de paciente</label>
              <select
                className={inputClass()}
                value={filters.patientType}
                onChange={(e) => updateFilter({ patientType: e.target.value })}
              >
                <option value="todos">Todos</option>
                <option value="cadastrado">Cadastrado</option>
                <option value="avulso">Avulso</option>
              </select>
            </div>
            {(filters.search || filters.date || filters.status !== "todos" || filters.profissionalId !== "todos" || filters.servicoId !== "todos" || filters.patientType !== "todos") && (
              <div className="flex items-end">
                <button
                  className="h-9 rounded-xl border border-border px-3 text-xs font-medium text-ink-secondary transition hover:border-error hover:text-error"
                  type="button"
                  onClick={() => { setFilters({ search: "", status: "todos", profissionalId: "todos", date: "", servicoId: "todos", patientType: "todos" }); setPage(0); }}
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Cards de resumo ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          { label: "Hoje",        value: summary.today,     Icon: Calendar,     iconBg: "bg-blue-100",    iconColor: "text-blue-600",    numColor: "text-blue-700"    },
          { label: "Confirmados", value: summary.confirmed, Icon: CircleCheck,  iconBg: "bg-emerald-100", iconColor: "text-emerald-600", numColor: "text-emerald-700" },
          { label: "Pendentes",   value: summary.pending,   Icon: Clock3,       iconBg: "bg-amber-100",   iconColor: "text-amber-600",   numColor: "text-amber-700"   },
          { label: "Cancelados",  value: summary.cancelled, Icon: CircleX,      iconBg: "bg-slate-100",   iconColor: "text-slate-500",   numColor: "text-slate-600"   },
        ] as const).map(({ label, value, Icon, iconBg, iconColor, numColor }) => (
          <div key={label} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-muted">{label}</p>
                <p className={`mt-1 text-3xl font-bold tracking-tight ${numColor}`}>{value}</p>
              </div>
              <div className={`shrink-0 rounded-xl p-2.5 ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-0.5 rounded-xl border border-border bg-surface-low p-1 w-fit">
        <button
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "lista" ? "bg-primary text-white shadow-sm" : "text-ink-secondary hover:text-ink"
          }`}
          type="button"
          onClick={() => setActiveTab("lista")}
        >
          <List className="h-3.5 w-3.5" />
          Lista
        </button>
        <button
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "calendario" ? "bg-primary text-white shadow-sm" : "text-ink-secondary hover:text-ink"
          }`}
          type="button"
          onClick={() => setActiveTab("calendario")}
        >
          <CalendarRange className="h-3.5 w-3.5" />
          Calendário
        </button>
      </div>

      {/* ── Aba Lista ──────────────────────────────────────────────────────── */}
      {activeTab === "lista" && (
        filteredAppointments.length === 0 ? (
          <div className="rounded-3xl border border-border bg-white p-10 text-center shadow-card">
            <Calendar className="mx-auto h-10 w-10 text-ink-muted opacity-40" />
            <h3 className="mt-4 text-base font-semibold text-ink">Nenhum agendamento encontrado</h3>
            <p className="mt-1 text-sm text-ink-secondary">
              Não há horários cadastrados para os filtros selecionados.
            </p>
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
              type="button"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              Novo agendamento
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-white shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-low">
                    {["Horário", "Paciente", "Profissional", "Serviço", "Status", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedAppointments.items.map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="group border-b border-border-divider transition hover:bg-surface-low"
                    >
                      <td className="px-4 py-3 text-ink-secondary">
                        <p className="font-mono text-[13px] font-semibold text-ink">{appointment.horario}</p>
                        <p className="text-[11px] text-ink-muted">
                          {new Date(`${appointment.data}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{appointment.pacienteNome}</p>
                        {appointment.pacienteId && (
                          <ProgramBadge
                            membership={memberships.find((m) => m.patientId === appointment.pacienteId) ?? null}
                            programas={programas}
                            patients={patients}
                            compact
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-secondary">{appointment.profissional}</td>
                      <td className="px-4 py-3 text-ink-secondary">{appointment.servico}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <ApptStatus status={appointment.status} />
                          {appointment.tipoAtendimento === "teleconsulta" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                              <Video className="h-2.5 w-2.5" />
                              Teleconsulta
                            </span>
                          )}
                          {appointment.recorrenciaId && (
                            <span className="rounded-full border border-primary/20 bg-primary-wash px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              Série
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 transition group-hover:opacity-100">
                          <button
                            className="rounded-xl border border-border px-2.5 py-1 text-xs font-medium text-ink-secondary transition hover:border-primary hover:text-primary"
                            type="button"
                            onClick={() => openEdit(appointment)}
                          >
                            Editar
                          </button>
                          {appointment.recorrenciaId && (
                            <button
                              className="rounded-xl border border-border px-2.5 py-1 text-xs font-medium text-ink-secondary transition hover:border-error hover:text-error"
                              type="button"
                              onClick={() => void confirmDangerAction(`Excluir toda a série recorrente de ${appointment.pacienteNome}? Todos os horários vinculados serão removidos.`).then((ok) => { if (ok && appointment.recorrenciaId) onDeleteSeries(appointment.recorrenciaId); })}
                            >
                              Excluir série
                            </button>
                          )}
                          <button
                            aria-label={`Excluir agendamento de ${appointment.pacienteNome}`}
                            className="rounded-xl p-1.5 text-ink-muted transition hover:bg-red-50 hover:text-error"
                            type="button"
                            onClick={() => void confirmDangerAction(`Excluir agendamento de ${appointment.pacienteNome}? Essa ação não pode ser desfeita.`).then((ok) => { if (ok) onDelete(appointment.id); })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredAppointments.length > pageSize && (
              <div className="border-t border-border-divider px-4 py-3">
                <Pagination
                  total={filteredAppointments.length}
                  page={paginatedAppointments.page}
                  pageSize={pageSize}
                  onPage={(p) => setPage(p)}
                  onPageSize={(s) => { setPageSize(s); setPage(0); }}
                />
              </div>
            )}
          </div>
        )
      )}

      {/* ── Aba Calendário ─────────────────────────────────────────────────── */}
      {activeTab === "calendario" && (
        <ClinicCalendar
          appointments={appointments}
          professionals={professionals}
          onClickAppointment={openEdit}
        />
      )}

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel */}
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Agendamentos</p>
                <h2 className="text-base font-semibold text-ink">
                  {drawerForm.id ? "Editar agendamento" : "Novo agendamento"}
                </h2>
              </div>
              <button
                className="rounded-xl p-2 text-ink-muted transition hover:bg-surface-low hover:text-ink"
                type="button"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-5">
                {localError && (
                  <div className="rounded-xl border border-error/30 bg-red-50 px-4 py-2.5 text-sm text-error">
                    {localError}
                  </div>
                )}

                {/* Paciente */}
                <div className="space-y-3 rounded-2xl border border-border-divider bg-surface-low p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Paciente</p>
                  <Field label="Buscar paciente cadastrado">
                    <PatientSearch
                      patients={patients}
                      selectedId={drawerForm.pacienteId}
                      onSelect={(id, nome, whatsapp) =>
                        setDrawerForm((f) => ({ ...f, pacienteId: id, pacienteNome: nome, pacienteWhatsapp: whatsapp }))
                      }
                    />
                  </Field>
                  <Field label="Nome (avulso)">
                    <input
                      className={inputClass()}
                      placeholder="Ou digite um nome livre"
                      value={drawerForm.pacienteNome}
                      onChange={(e) => setDrawerForm({ ...drawerForm, pacienteNome: e.target.value })}
                    />
                  </Field>
                  <Field label="WhatsApp">
                    <input
                      className={inputClass()}
                      placeholder="(11) 99999-9999"
                      value={drawerForm.pacienteWhatsapp}
                      onChange={(e) => setDrawerForm({ ...drawerForm, pacienteWhatsapp: e.target.value })}
                    />
                  </Field>
                </div>

                {/* Detalhes */}
                <div className="space-y-3 rounded-2xl border border-border-divider bg-surface-low p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Detalhes do atendimento</p>

                  {/* Tipo de atendimento */}
                  <div className="flex gap-2">
                    {(["presencial", "teleconsulta"] as const).map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition ${
                          drawerForm.tipoAtendimento === tipo
                            ? tipo === "teleconsulta"
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : "border-primary/30 bg-primary/5 text-primary"
                            : "border-border text-ink-muted hover:border-border-strong"
                        }`}
                        onClick={() => setDrawerForm((f) => ({ ...f, tipoAtendimento: tipo }))}
                      >
                        {tipo === "teleconsulta" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                        {tipo === "presencial" ? "Presencial" : "Teleconsulta"}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Profissional *">
                      <select
                        className={inputClass()}
                        value={drawerForm.profissionalId}
                        onChange={(e) => setDrawerForm({ ...drawerForm, profissionalId: e.target.value })}
                      >
                        {professionals.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                    </Field>
                    <Field label="Serviço">
                      <select
                        className={inputClass()}
                        value={drawerForm.servicoId}
                        onChange={(e) => setDrawerForm({ ...drawerForm, servicoId: e.target.value })}
                      >
                        <option value="">Sem serviço específico</option>
                        {services.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                      </select>
                    </Field>
                    <Field label="Data *">
                      <input
                        className={inputClass()}
                        type="date"
                        value={drawerForm.data}
                        onChange={(e) => setDrawerForm({ ...drawerForm, data: e.target.value })}
                      />
                    </Field>
                    <Field label="Horário *">
                      <input
                        className={inputClass()}
                        type="time"
                        value={drawerForm.horario}
                        onChange={(e) => setDrawerForm({ ...drawerForm, horario: e.target.value })}
                      />
                    </Field>
                    <Field label="Status">
                      <select
                        className={inputClass()}
                        value={drawerForm.status}
                        onChange={(e) => setDrawerForm({ ...drawerForm, status: e.target.value as Appointment["status"] })}
                      >
                        <option value="confirmado">Confirmado</option>
                        <option value="pendente">Pendente</option>
                        <option value="concluido">Concluído</option>
                        <option value="faltou">Faltou</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </Field>
                  </div>
                </div>

                {/* ── Painel de Teleconsulta ──────────────────────────── */}
                {drawerForm.tipoAtendimento === "teleconsulta" && drawerForm.id && (
                  <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-blue-600" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Teleconsulta</p>
                    </div>

                    {loadingTele && (
                      <div className="flex items-center gap-2 py-2 text-xs text-ink-secondary">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando dados da sala...
                      </div>
                    )}

                    {teleError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {teleError}
                      </div>
                    )}

                    {!loadingTele && !teleconsulta && (
                      <div className="space-y-2">
                        <p className="text-xs text-blue-700">Nenhuma sala criada para este agendamento.</p>
                        <button
                          type="button"
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                          disabled={creatingRoom}
                          onClick={() => void handleCreateRoom()}
                        >
                          {creatingRoom ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Criando sala...</> : <><Video className="h-3.5 w-3.5" /> Criar sala no Whereby</>}
                        </button>
                      </div>
                    )}

                    {!loadingTele && teleconsulta && (
                      <div className="space-y-3">
                        {/* Status */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-blue-600">Status</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            teleconsulta.status === "erro_sala"
                              ? "bg-red-100 text-red-700"
                              : teleconsulta.status === "em_atendimento"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {TELECONSULTA_STATUS_LABEL[teleconsulta.status] ?? teleconsulta.status}
                          </span>
                        </div>

                        {/* Link do paciente */}
                        {teleconsulta.patientAccessUrl && (
                          <div className="rounded-xl border border-blue-200 bg-white px-3 py-2">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-blue-500">Link do paciente</p>
                            <p className="break-all font-mono text-[10px] text-ink-secondary">{teleconsulta.patientAccessUrl}</p>
                          </div>
                        )}

                        {/* Ações */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                            disabled={!teleconsulta.patientAccessUrl}
                            onClick={() => void handleCopyPatientLink()}
                          >
                            <Copy className="h-3 w-3" />
                            {copied ? "Copiado!" : "Copiar link"}
                          </button>
                          <button
                            type="button"
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-green-200 bg-white px-3 py-2 text-xs font-medium text-green-700 transition hover:bg-green-50 disabled:opacity-50"
                            disabled={!teleconsulta.patientAccessUrl || !drawerForm.pacienteWhatsapp || sendingWpp}
                            onClick={() => void handleSendWhatsApp()}
                          >
                            {sendingWpp
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <ExternalLink className="h-3 w-3" />}
                            {wppSent ? "Enviado!" : sendingWpp ? "Enviando..." : "WhatsApp"}
                          </button>
                        </div>

                        {/* Entrar como profissional */}
                        {(role === "admin" || role === "profissional") && (teleconsulta.wherebyHostRoomUrl ?? teleconsulta.wherebyRoomUrl) && (
                          <button
                            type="button"
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                            onClick={handleEnterAsProfessional}
                          >
                            <Video className="h-3.5 w-3.5" />
                            Entrar como profissional
                          </button>
                        )}

                        {/* Recriar sala */}
                        {(teleconsulta.status === "erro_sala" || teleconsulta.wherebyRoomUrl) && (
                          <button
                            type="button"
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-ink-secondary transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
                            disabled={creatingRoom}
                            onClick={() => void handleCreateRoom()}
                          >
                            <RefreshCw className="h-3 w-3" />
                            {creatingRoom ? "Recriando..." : "Recriar sala"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Recorrência (só para novo) */}
                {!drawerForm.id && (
                  <div className="space-y-3 rounded-2xl border border-border-divider bg-surface-low p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Recorrência</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Frequência">
                        <select
                          className={inputClass()}
                          value={drawerForm.recorrenciaFrequency}
                          onChange={(e) => setDrawerForm({ ...drawerForm, recorrenciaFrequency: e.target.value as RecurrenceFrequency })}
                        >
                          <option value="none">Não repetir</option>
                          <option value="weekly">Semanal</option>
                          <option value="biweekly">Quinzenal</option>
                          <option value="monthly">Mensal</option>
                        </select>
                      </Field>
                      {drawerForm.recorrenciaFrequency !== "none" && (
                        <Field label="Quantidade">
                          <input
                            className={inputClass()}
                            max={24}
                            min={2}
                            type="number"
                            value={drawerForm.recorrenciaOccurrences}
                            onChange={(e) =>
                              setDrawerForm({
                                ...drawerForm,
                                recorrenciaOccurrences: Math.min(24, Math.max(2, Number(e.target.value) || 2)),
                              })
                            }
                          />
                        </Field>
                      )}
                    </div>
                    {drawerForm.recorrenciaFrequency !== "none" && (
                      <div className="rounded-xl border border-primary/20 bg-primary-wash px-3 py-2 text-xs text-primary">
                        <p className="font-semibold">{recurrenceDates.length} horários serão criados</p>
                        <p className="mt-0.5 text-primary/70">
                          {recurrenceDates.slice(0, 3).map((d) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR")).join(", ")}
                          {recurrenceDates.length > 3 ? "..." : ""}
                        </p>
                        {recurrenceConflicts.length > 0 && (
                          <p className="mt-1 font-semibold text-error">
                            ⚠ Conflito em: {recurrenceConflicts.slice(0, 2).map((d) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR")).join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-low px-5 py-4">
              <div className="flex gap-2">
                <button
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-ink-secondary transition hover:bg-surface-low"
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                >
                  Fechar
                </button>
                {drawerForm.id && drawerForm.status !== "cancelado" && (
                  <button
                    className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                    type="button"
                    disabled={saving}
                    onClick={() => void confirmDangerAction("Cancelar este agendamento? O histórico será mantido com status Cancelado.").then((ok) => { if (ok) void handleCancelAppointment(); })}
                  >
                    Cancelar agendamento
                  </button>
                )}
              </div>
              <button
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-60"
                type="button"
                disabled={saving}
                onClick={() => void handleSubmit()}
              >
                {saving ? "Salvando..." : drawerForm.id ? "Salvar alterações" : drawerForm.recorrenciaFrequency !== "none" ? "Criar série" : "Salvar agendamento"}
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
