import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  User,
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
import { checkAvailability, loadClinicSchedules, type ProfessionalSchedule } from "../../../services/professionalScheduleService";
import { supabase } from "../../../lib/supabaseClient";
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

type AttendanceQueueStatus = "aguardando" | "em_atendimento" | "finalizado" | "faltou" | "cancelado";

type AttendanceQueueItem = {
  id: string;
  agendamento_id: string | null;
  paciente_id: string | null;
  profissional_id: string | null;
  servico_id: string | null;
  paciente_nome: string;
  paciente_whatsapp: string | null;
  profissional_nome: string | null;
  servico_nome: string | null;
  data: string;
  ordem: number;
  chegada_em: string;
  status: AttendanceQueueStatus;
  prioridade: boolean;
  observacoes: string | null;
};

type WalkInForm = {
  pacienteId: string;
  pacienteNome: string;
  pacienteWhatsapp: string;
  profissionalId: string;
  servicoId: string;
  observacoes: string;
  prioridade: boolean;
};

const QUEUE_STATUS_CONFIG: Record<AttendanceQueueStatus, { label: string; cls: string }> = {
  aguardando: { label: "Aguardando", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  em_atendimento: { label: "Em atendimento", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  finalizado: { label: "Finalizado", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  faltou: { label: "Faltou", cls: "bg-red-50 text-red-600 border-red-200" },
  cancelado: { label: "Cancelado", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

function QueueStatusBadge({ status }: { readonly status: AttendanceQueueStatus }) {
  const { label, cls } = QUEUE_STATUS_CONFIG[status] ?? QUEUE_STATUS_CONFIG.aguardando;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

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

const EMPTY_WALK_IN_FORM = (professionals: Professional[], services: Service[]): WalkInForm => ({
  pacienteId: "",
  pacienteNome: "",
  pacienteWhatsapp: "",
  profissionalId: professionals[0]?.id ?? "",
  servicoId: services[0]?.id ?? "",
  observacoes: "",
  prioridade: false,
});

function formatQueueTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function errorMessage(error: unknown, fallback = "Nao foi possivel concluir a acao.") {
  return (error as { message?: string } | null)?.message ?? fallback;
}

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
  const [activeTab, setActiveTab] = useState<"lista" | "calendario" | "ordem">("lista");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerForm, setDrawerForm] = useState(() => EMPTY_FORM(professionals, services));
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [queueDate, setQueueDate] = useState(todayISO());
  const [queueItems, setQueueItems] = useState<AttendanceQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueSaving, setQueueSaving] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInForm, setWalkInForm] = useState(() => EMPTY_WALK_IN_FORM(professionals, services));
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
  const [instName, setInstName] = useState(DEFAULT_INSTANCE_NAME);
  // Cache em memória: evita re-buscar do banco ao fechar e reabrir o drawer
  const teleCache = useRef<Map<string, TeleconsultaData>>(new Map());

  // Modal de dados do paciente/agendamento
  const [patientModal, setPatientModal] = useState<{ appointment: Appointment; patient: Patient | null } | null>(null);

  // Horários de disponibilidade dos profissionais
  const [clinicSchedules, setClinicSchedules] = useState<ProfessionalSchedule[]>([]);

  useEffect(() => {
    supabase
      .from("whatsapp_instances")
      .select("instance_name")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data?.instance_name) setInstName(data.instance_name); });
  }, [clinicId]);

  // Carrega horários de todos os profissionais da clínica para verificação de disponibilidade
  useEffect(() => {
    loadClinicSchedules(clinicId).then(setClinicSchedules).catch(() => {});
  }, [clinicId]);

  // Pré-carrega teleconsultas de todos os agendamentos tipo "teleconsulta"
  useEffect(() => {
    const ids = appointments.filter(a => a.tipoAtendimento === "teleconsulta").map(a => a.id);
    if (ids.length === 0) return;
    supabase
      .from("teleconsultations")
      .select("*")
      .in("appointment_id", ids)
      .then(({ data }) => {
        if (!data) return;
        data.forEach((row: Record<string, unknown>) => {
          teleCache.current.set(row.appointment_id as string, {
            id: row.id as string,
            appointmentId: row.appointment_id as string,
            wherebyRoomUrl: row.whereby_room_url as string | null,
            wherebyHostRoomUrl: row.whereby_host_room_url as string | null,
            status: row.status as string,
            consentStatus: row.consent_status as string,
            patientAccessToken: row.patient_access_token as string,
            patientAccessUrl: row.patient_access_url as string | null,
            tokenExpiresAt: row.token_expires_at as string | null,
            linkSentAt: row.link_sent_at as string | null,
            errorMessage: row.error_message as string | null,
          });
        });
      });
  }, [appointments]);

  useEffect(() => {
    if (!drawerOpen || !drawerForm.id || drawerForm.tipoAtendimento !== "teleconsulta") {
      setTeleconsulta(null);
      setTeleError(null);
      return;
    }
    // Usa cache local antes de buscar no banco
    const cached = teleCache.current.get(drawerForm.id);
    if (cached) {
      setTeleconsulta(cached);
      return;
    }
    setLoadingTele(true);
    void getTeleconsultaByAppointment(drawerForm.id)
      .then((data) => {
        if (data) teleCache.current.set(drawerForm.id, data);
        setTeleconsulta(data);
      })
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

  const queuedAppointmentIds = useMemo(
    () => new Set(queueItems.map((item) => item.agendamento_id).filter(Boolean)),
    [queueItems]
  );

  const appointmentsForQueueDate = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.data === queueDate && appointment.status !== "cancelado")
        .sort((a, b) => a.horario.localeCompare(b.horario)),
    [appointments, queueDate]
  );

  const waitingAppointments = useMemo(
    () => appointmentsForQueueDate.filter((appointment) => !queuedAppointmentIds.has(appointment.id)),
    [appointmentsForQueueDate, queuedAppointmentIds]
  );

  const orderedQueueItems = useMemo(
    () => [...queueItems].sort((a, b) => a.ordem - b.ordem || a.chegada_em.localeCompare(b.chegada_em)),
    [queueItems]
  );

  const queueSummary = useMemo(() => ({
    waiting: queueItems.filter((item) => item.status === "aguardando").length,
    active: queueItems.filter((item) => item.status === "em_atendimento").length,
    done: queueItems.filter((item) => item.status === "finalizado").length,
    total: queueItems.length,
  }), [queueItems]);

  const loadAttendanceQueue = useCallback(async () => {
    setQueueLoading(true);
    setQueueError(null);
    const { data, error } = await supabase
      .from("fila_atendimento")
      .select("*")
      .eq("clinica_id", clinicId)
      .eq("data", queueDate)
      .order("ordem", { ascending: true });

    if (error) {
      setQueueError(errorMessage(error, "Nao foi possivel carregar a ordem de atendimento."));
      setQueueItems([]);
    } else {
      setQueueItems((data ?? []) as AttendanceQueueItem[]);
    }
    setQueueLoading(false);
  }, [clinicId, queueDate]);

  useEffect(() => {
    if (activeTab === "ordem") void loadAttendanceQueue();
  }, [activeTab, loadAttendanceQueue]);

  function nextQueueOrder() {
    return Math.max(0, ...queueItems.map((item) => item.ordem)) + 1;
  }

  async function addAppointmentToQueue(appointment: Appointment) {
    if (queuedAppointmentIds.has(appointment.id)) return;
    setQueueSaving(true);
    setQueueError(null);

    const professionalId = appointment.profissionalId ?? professionals.find((p) => p.nome === appointment.profissional)?.id ?? null;
    const serviceId = appointment.servicoId ?? services.find((s) => s.nome === appointment.servico)?.id ?? null;
    const { error } = await supabase.from("fila_atendimento").insert({
      clinica_id: clinicId,
      agendamento_id: appointment.id,
      paciente_id: appointment.pacienteId ?? null,
      profissional_id: professionalId,
      servico_id: serviceId,
      paciente_nome: appointment.pacienteNome,
      paciente_whatsapp: appointment.pacienteWhatsapp ?? null,
      profissional_nome: appointment.profissional,
      servico_nome: appointment.servico,
      data: queueDate,
      ordem: nextQueueOrder(),
      status: "aguardando",
    });

    if (error) setQueueError(errorMessage(error, "Nao foi possivel adicionar o paciente a fila."));
    else await loadAttendanceQueue();
    setQueueSaving(false);
  }

  async function createWalkInAndQueue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedPatient = patients.find((patient) => patient.id === walkInForm.pacienteId);
    const patientName = (selectedPatient?.nome ?? walkInForm.pacienteNome).trim();
    const patientWhatsapp = selectedPatient?.whatsapp ?? walkInForm.pacienteWhatsapp.trim();
    const professional = professionals.find((item) => item.id === walkInForm.profissionalId);
    const service = services.find((item) => item.id === walkInForm.servicoId);

    setQueueError(null);
    if (!professional) { setQueueError("Selecione o profissional para o encaixe."); return; }
    if (patientName.length < 3) { setQueueError("Informe o nome do paciente para entrar na fila."); return; }

    setQueueSaving(true);
    const now = new Date();
    const horario = queueDate === todayISO() ? now.toTimeString().slice(0, 5) : "08:00";
    const { data: createdAppointment, error: appointmentError } = await supabase
      .from("agendamentos")
      .insert({
        clinica_id: clinicId,
        profissional_id: professional.id,
        servico_id: service?.id ?? null,
        paciente_id: selectedPatient?.id ?? null,
        paciente_nome: patientName,
        paciente_whatsapp: patientWhatsapp,
        data: queueDate,
        horario,
        status: "confirmado",
        tipo_atendimento: "presencial",
      })
      .select("id")
      .single();

    if (appointmentError || !createdAppointment) {
      setQueueError(errorMessage(appointmentError, "Nao foi possivel criar o encaixe."));
      setQueueSaving(false);
      return;
    }

    const { error: queueInsertError } = await supabase.from("fila_atendimento").insert({
      clinica_id: clinicId,
      agendamento_id: createdAppointment.id,
      paciente_id: selectedPatient?.id ?? null,
      profissional_id: professional.id,
      servico_id: service?.id ?? null,
      paciente_nome: patientName,
      paciente_whatsapp: patientWhatsapp || null,
      profissional_nome: professional.nome,
      servico_nome: service?.nome ?? "Atendimento",
      data: queueDate,
      ordem: nextQueueOrder(),
      status: "aguardando",
      prioridade: walkInForm.prioridade,
      observacoes: walkInForm.observacoes.trim() || null,
    });

    if (queueInsertError) setQueueError(errorMessage(queueInsertError, "Encaixe criado, mas nao entrou na fila."));
    else {
      setWalkInForm(EMPTY_WALK_IN_FORM(professionals, services));
      setShowWalkInForm(false);
      await loadAttendanceQueue();
    }
    setQueueSaving(false);
  }

  async function updateQueueStatus(item: AttendanceQueueItem, status: AttendanceQueueStatus) {
    setQueueSaving(true);
    setQueueError(null);
    const { error } = await supabase
      .from("fila_atendimento")
      .update({ status })
      .eq("clinica_id", clinicId)
      .eq("id", item.id);

    if (error) {
      setQueueError(errorMessage(error, "Nao foi possivel atualizar a fila."));
      setQueueSaving(false);
      return;
    }

    if (item.agendamento_id && ["finalizado", "faltou", "cancelado"].includes(status)) {
      const appointmentStatus = status === "finalizado" ? "concluido" : status;
      await supabase.from("agendamentos").update({ status: appointmentStatus }).eq("id", item.agendamento_id);
    }

    await loadAttendanceQueue();
    setQueueSaving(false);
  }

  async function callNextQueueItem() {
    const next = orderedQueueItems.find((item) => item.status === "aguardando");
    if (next) await updateQueueStatus(next, "em_atendimento");
  }

  async function moveQueueItem(item: AttendanceQueueItem, direction: -1 | 1) {
    const currentIndex = orderedQueueItems.findIndex((current) => current.id === item.id);
    const target = orderedQueueItems[currentIndex + direction];
    if (!target) return;

    setQueueSaving(true);
    setQueueError(null);
    const [first, second] = await Promise.all([
      supabase.from("fila_atendimento").update({ ordem: target.ordem }).eq("clinica_id", clinicId).eq("id", item.id),
      supabase.from("fila_atendimento").update({ ordem: item.ordem }).eq("clinica_id", clinicId).eq("id", target.id),
    ]);

    const error = first.error ?? second.error;
    if (error) setQueueError(errorMessage(error, "Nao foi possivel reordenar a fila."));
    else await loadAttendanceQueue();
    setQueueSaving(false);
  }

  async function removeQueueItem(item: AttendanceQueueItem) {
    const ok = await confirmDangerAction(`Remover ${item.paciente_nome} da ordem de atendimento? O agendamento original sera mantido.`);
    if (!ok) return;
    setQueueSaving(true);
    setQueueError(null);
    const { error } = await supabase.from("fila_atendimento").delete().eq("clinica_id", clinicId).eq("id", item.id);
    if (error) setQueueError(errorMessage(error, "Nao foi possivel remover da fila."));
    else await loadAttendanceQueue();
    setQueueSaving(false);
  }

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

      const result = await createTeleconsultaRoom({
        clinicId,
        appointmentId: drawerForm.id,
        patientId: drawerForm.pacienteId || null,
        professionalId,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      });

      const refreshed = await getTeleconsultaByAppointment(drawerForm.id);
      const roomData: TeleconsultaData = refreshed ?? {
        id: drawerForm.id,
        appointmentId: drawerForm.id,
        wherebyRoomUrl: result.roomUrl,
        wherebyHostRoomUrl: result.hostRoomUrl,
        status: "sala_criada",
        consentStatus: "pendente",
        patientAccessToken: result.patientAccessToken,
        patientAccessUrl: result.patientAccessUrl,
        tokenExpiresAt: result.tokenExpiresAt,
        linkSentAt: null,
        errorMessage: null,
      };
      // Persiste no cache para sobreviver ao fechar/reabrir o drawer
      teleCache.current.set(drawerForm.id, roomData);
      setTeleconsulta(roomData);
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
      await sendWhatsAppText(instName, phone, message);
      void markLinkSent(drawerForm.id);
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
      <div className="flex w-fit flex-wrap gap-0.5 rounded-xl border border-border bg-surface-low p-1">
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
        <button
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "ordem" ? "bg-primary text-white shadow-sm" : "text-ink-secondary hover:text-ink"
          }`}
          type="button"
          onClick={() => setActiveTab("ordem")}
        >
          <Clock3 className="h-3.5 w-3.5" />
          Ordem de atendimento
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
                        <button
                          type="button"
                          className="text-left transition hover:text-primary"
                          onClick={() => setPatientModal({
                            appointment,
                            patient: patients.find((p) => p.id === appointment.pacienteId) ?? null,
                          })}
                        >
                          <p className="font-medium text-ink hover:text-primary">{appointment.pacienteNome}</p>
                        </button>
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
      {activeTab === "ordem" && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Ordem de atendimento</p>
                <p className="text-xs text-ink-secondary">Use esta fila quando a clinica atende pela ordem de chegada.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input className={`${inputClass()} h-10 w-[150px]`} type="date" value={queueDate} onChange={(e) => setQueueDate(e.target.value || todayISO())} />
                <button className="h-10 rounded-xl border border-border px-3 text-xs font-semibold text-ink-secondary transition hover:border-primary hover:text-primary" type="button" onClick={() => setQueueDate(todayISO())}>
                  Hoje
                </button>
                <button className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-ink-secondary transition hover:border-primary hover:text-primary" type="button" onClick={() => void loadAttendanceQueue()} disabled={queueLoading}>
                  <RefreshCw className={`h-3.5 w-3.5 ${queueLoading ? "animate-spin" : ""}`} />
                  Atualizar
                </button>
                <button className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60" type="button" onClick={() => setShowWalkInForm((value) => !value)} disabled={queueSaving}>
                  <Plus className="h-3.5 w-3.5" />
                  Encaixe
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              {[
                { label: "Aguardando", value: queueSummary.waiting },
                { label: "Em atendimento", value: queueSummary.active },
                { label: "Finalizados", value: queueSummary.done },
                { label: "Na fila", value: queueSummary.total },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-surface-low p-3">
                  <p className="text-[11px] font-medium text-ink-muted">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold text-ink">{item.value}</p>
                </div>
              ))}
            </div>

            {queueError && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{queueError}</div>}
          </div>

          {showWalkInForm && (
            <form className="rounded-3xl border border-border bg-white p-4 shadow-card" onSubmit={createWalkInAndQueue}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Novo encaixe na fila</p>
                  <p className="text-xs text-ink-secondary">Cria um agendamento presencial e adiciona o paciente na ordem do dia.</p>
                </div>
                <button className="rounded-xl p-2 text-ink-muted transition hover:bg-surface-low hover:text-ink" type="button" onClick={() => setShowWalkInForm(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Paciente cadastrado">
                  <select
                    className={inputClass()}
                    value={walkInForm.pacienteId}
                    onChange={(e) => {
                      const patient = patients.find((item) => item.id === e.target.value);
                      setWalkInForm((prev) => ({
                        ...prev,
                        pacienteId: e.target.value,
                        pacienteNome: patient?.nome ?? prev.pacienteNome,
                        pacienteWhatsapp: patient?.whatsapp ?? prev.pacienteWhatsapp,
                      }));
                    }}
                  >
                    <option value="">Paciente avulso</option>
                    {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.nome}</option>)}
                  </select>
                </Field>
                <Field label="Nome do paciente">
                  <input
                    className={inputClass()}
                    value={walkInForm.pacienteNome}
                    onChange={(e) => setWalkInForm((prev) => ({ ...prev, pacienteNome: e.target.value, pacienteId: "" }))}
                    placeholder="Nome completo"
                  />
                </Field>
                <Field label="WhatsApp">
                  <input className={inputClass()} value={walkInForm.pacienteWhatsapp} onChange={(e) => setWalkInForm((prev) => ({ ...prev, pacienteWhatsapp: e.target.value }))} placeholder="(00) 00000-0000" />
                </Field>
                <Field label="Profissional">
                  <select className={inputClass()} value={walkInForm.profissionalId} onChange={(e) => setWalkInForm((prev) => ({ ...prev, profissionalId: e.target.value }))} required>
                    {professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.nome}</option>)}
                  </select>
                </Field>
                <Field label="Servico">
                  <select className={inputClass()} value={walkInForm.servicoId} onChange={(e) => setWalkInForm((prev) => ({ ...prev, servicoId: e.target.value }))}>
                    <option value="">Atendimento</option>
                    {services.map((service) => <option key={service.id} value={service.id}>{service.nome}</option>)}
                  </select>
                </Field>
                <Field label="Observacoes">
                  <input className={inputClass()} value={walkInForm.observacoes} onChange={(e) => setWalkInForm((prev) => ({ ...prev, observacoes: e.target.value }))} placeholder="Ex.: retorno rapido" />
                </Field>
                <label className="flex h-10 items-center gap-2 self-end rounded-xl border border-border px-3 text-sm text-ink-secondary">
                  <input type="checkbox" checked={walkInForm.prioridade} onChange={(e) => setWalkInForm((prev) => ({ ...prev, prioridade: e.target.checked }))} />
                  Prioridade
                </label>
                <button className="h-10 self-end rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60" type="submit" disabled={queueSaving}>
                  {queueSaving ? "Adicionando..." : "Adicionar a fila"}
                </button>
              </div>
            </form>
          )}

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.35fr]">
            <div className="rounded-3xl border border-border bg-white shadow-card">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-ink">Agendados do dia</p>
                <p className="text-xs text-ink-secondary">{waitingAppointments.length} fora da fila</p>
              </div>
              <div className="max-h-[560px] space-y-2 overflow-y-auto p-4">
                {appointmentsForQueueDate.length === 0 && <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-ink-secondary">Nenhum agendamento para esta data.</div>}
                {appointmentsForQueueDate.map((appointment) => {
                  const isQueued = queuedAppointmentIds.has(appointment.id);
                  return (
                    <div key={appointment.id} className="rounded-2xl border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-primary">{appointment.horario}</p>
                          <p className="mt-1 truncate text-sm font-semibold text-ink">{appointment.pacienteNome}</p>
                          <p className="truncate text-xs text-ink-secondary">{appointment.profissional} - {appointment.servico}</p>
                        </div>
                        <ApptStatus status={appointment.status} />
                      </div>
                      <button className="mt-3 h-9 w-full rounded-xl border border-border text-xs font-semibold text-ink-secondary transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:bg-surface-low disabled:text-ink-muted" type="button" disabled={isQueued || queueSaving} onClick={() => void addAppointmentToQueue(appointment)}>
                        {isQueued ? "Ja esta na fila" : "Adicionar a fila"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-white shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Fila do atendimento</p>
                  <p className="text-xs text-ink-secondary">Ordenada pela chegada, com ajuste manual quando necessario.</p>
                </div>
                <button className="h-9 rounded-xl bg-ink px-3 text-xs font-semibold text-white transition hover:bg-ink/90 disabled:opacity-50" type="button" onClick={() => void callNextQueueItem()} disabled={queueSaving || !orderedQueueItems.some((item) => item.status === "aguardando")}>
                  Chamar proximo
                </button>
              </div>

              <div className="max-h-[560px] space-y-2 overflow-y-auto p-4">
                {queueLoading && (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-border p-6 text-sm text-ink-secondary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando fila...
                  </div>
                )}
                {!queueLoading && orderedQueueItems.length === 0 && <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-ink-secondary">Nenhum paciente na ordem de atendimento desta data.</div>}
                {!queueLoading && orderedQueueItems.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-border p-3 transition hover:bg-surface-low">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-wash text-sm font-bold text-primary">{item.ordem}</div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-ink">{item.paciente_nome}</p>
                            <QueueStatusBadge status={item.status} />
                            {item.prioridade && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">Prioridade</span>}
                          </div>
                          <p className="mt-1 text-xs text-ink-secondary">Chegada {formatQueueTime(item.chegada_em)} - {item.profissional_nome ?? "Profissional"} - {item.servico_nome ?? "Atendimento"}</p>
                          {item.observacoes && <p className="mt-1 text-xs text-ink-muted">{item.observacoes}</p>}
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-secondary transition hover:border-primary hover:text-primary disabled:opacity-35" type="button" disabled={index === 0 || queueSaving} onClick={() => void moveQueueItem(item, -1)} aria-label="Subir na fila"><ChevronUp className="h-3.5 w-3.5" /></button>
                        <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-secondary transition hover:border-primary hover:text-primary disabled:opacity-35" type="button" disabled={index === orderedQueueItems.length - 1 || queueSaving} onClick={() => void moveQueueItem(item, 1)} aria-label="Descer na fila"><ChevronDown className="h-3.5 w-3.5" /></button>
                        {item.status === "aguardando" && <button className="h-8 rounded-lg border border-blue-200 px-2.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50" type="button" disabled={queueSaving} onClick={() => void updateQueueStatus(item, "em_atendimento")}>Chamar</button>}
                        {item.status === "em_atendimento" && <button className="h-8 rounded-lg border border-emerald-200 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50" type="button" disabled={queueSaving} onClick={() => void updateQueueStatus(item, "finalizado")}>Finalizar</button>}
                        {item.status !== "finalizado" && item.status !== "faltou" && <button className="h-8 rounded-lg border border-red-200 px-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50" type="button" disabled={queueSaving} onClick={() => void updateQueueStatus(item, "faltou")}>Faltou</button>}
                        <button className="h-8 rounded-lg border border-border px-2.5 text-xs font-semibold text-ink-secondary transition hover:border-error hover:text-error" type="button" disabled={queueSaving} onClick={() => void removeQueueItem(item)}>Remover</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "calendario" && (
        <ClinicCalendar
          appointments={appointments}
          professionals={professionals}
          onClickAppointment={openEdit}
        />
      )}

      {/* ── Modal de dados do paciente/agendamento ─────────────────────────── */}
      {patientModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setPatientModal(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  {patientModal.patient?.fotoUrl ? (
                    <img src={patientModal.patient.fotoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Paciente</p>
                    <h2 className="text-base font-semibold text-ink">{patientModal.appointment.pacienteNome}</h2>
                  </div>
                </div>
                <button
                  className="rounded-xl p-2 text-ink-muted transition hover:bg-surface-low hover:text-ink"
                  type="button"
                  onClick={() => setPatientModal(null)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="max-h-[65vh] overflow-y-auto p-5 space-y-4">
                {/* Dados cadastrais */}
                {patientModal.patient ? (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Dados cadastrais</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {[
                        { label: "CPF", value: patientModal.patient.cpf },
                        { label: "WhatsApp", value: patientModal.patient.whatsapp },
                        { label: "E-mail", value: patientModal.patient.email },
                        { label: "Nascimento", value: patientModal.patient.dataNascimento
                          ? new Date(`${patientModal.patient.dataNascimento}T12:00:00`).toLocaleDateString("pt-BR")
                          : null },
                        { label: "Convênio", value: patientModal.patient.convenio },
                        { label: "Status", value: patientModal.patient.status === "ativo"
                          ? "Ativo"
                          : patientModal.patient.status === "inativo"
                          ? "Inativo"
                          : "Retorno pendente" },
                      ].filter((item): item is { label: string; value: string } => Boolean(item.value)).map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[10px] font-semibold text-ink-muted">{label}</p>
                          <p className="mt-0.5 text-sm text-ink">{value}</p>
                        </div>
                      ))}
                    </div>
                    {patientModal.patient.endereco && (
                      <div>
                        <p className="text-[10px] font-semibold text-ink-muted">Endereço</p>
                        <p className="mt-0.5 text-sm text-ink">{patientModal.patient.endereco}</p>
                      </div>
                    )}
                    {patientModal.patient.observacoes && (
                      <div>
                        <p className="text-[10px] font-semibold text-ink-muted">Observações</p>
                        <p className="mt-0.5 text-sm text-ink">{patientModal.patient.observacoes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm italic text-ink-muted">Paciente avulso — sem cadastro no sistema.</p>
                )}

                {/* Dados do agendamento */}
                <div className="space-y-3 rounded-2xl border border-border-divider bg-surface-low p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">Agendamento</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <p className="text-[10px] font-semibold text-ink-muted">Data</p>
                      <p className="mt-0.5 text-sm text-ink">
                        {new Date(`${patientModal.appointment.data}T12:00:00`).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-ink-muted">Horário</p>
                      <p className="mt-0.5 font-mono text-sm text-ink">{patientModal.appointment.horario}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-ink-muted">Profissional</p>
                      <p className="mt-0.5 text-sm text-ink">{patientModal.appointment.profissional}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-ink-muted">Serviço</p>
                      <p className="mt-0.5 text-sm text-ink">{patientModal.appointment.servico || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-ink-muted">Tipo</p>
                      <p className="mt-0.5 text-sm capitalize text-ink">
                        {patientModal.appointment.tipoAtendimento ?? "presencial"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-ink-muted">Status</p>
                      <div className="mt-0.5">
                        <ApptStatus status={patientModal.appointment.status} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border px-5 py-4">
                <button
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-ink-secondary transition hover:bg-surface-low"
                  type="button"
                  onClick={() => setPatientModal(null)}
                >
                  Fechar
                </button>
                <button
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
                  type="button"
                  onClick={() => { setPatientModal(null); openEdit(patientModal.appointment); }}
                >
                  Editar agendamento
                </button>
              </div>
            </div>
          </div>
        </>
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
                    <div>
                      <Field label="Data *">
                        <input
                          className={inputClass()}
                          type="date"
                          value={drawerForm.data}
                          onChange={(e) => setDrawerForm({ ...drawerForm, data: e.target.value })}
                        />
                      </Field>
                      {/* Aviso de disponibilidade do profissional */}
                      {drawerForm.data && drawerForm.profissionalId && (() => {
                        const available = checkAvailability(drawerForm.data, drawerForm.profissionalId, clinicSchedules);
                        if (available === null) return null; // sem horários cadastrados = sem restrição
                        if (available) return (
                          <p className="mt-1 text-[11px] font-medium text-emerald-600">
                            ✓ Profissional tem agenda neste dia.
                          </p>
                        );
                        return (
                          <p className="mt-1 text-[11px] font-medium text-amber-600">
                            ⚠ Este profissional normalmente não atende neste dia. Confirme antes de salvar.
                          </p>
                        );
                      })()}
                    </div>
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
