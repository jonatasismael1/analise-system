import { useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
import { todayISO } from "../../../lib/formatters";
import { buildRecurringDates, type RecurrenceFrequency } from "../../../services/appointmentService";
import type { Appointment, Patient, Professional, Service } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";
import { Pagination, usePagination } from "../components/Pagination";
import { RefinedTable } from "../components/RefinedTable";
import { StatusPill } from "../components/StatusPill";
import { ClinicCalendar } from "../components/ClinicCalendar";

// Campo de busca de paciente com autocomplete
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
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-border-strong bg-surface shadow-modal">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                className="flex w-full flex-col px-3 py-2 text-left text-[13px] hover:bg-primary-wash transition"
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
  recorrenciaFrequency: "none" as RecurrenceFrequency,
  recorrenciaOccurrences: 4,
});

export function AppointmentsPanel({ appointments, patients, professionals, services, onSave, onDelete, onDeleteSeries }: {
  readonly appointments: Appointment[];
  readonly patients: Patient[];
  readonly professionals: Professional[];
  readonly services: Service[];
  readonly onSave: (values: { id?: string; profissionalId: string; servicoId?: string | null; pacienteId?: string | null; pacienteNome: string; pacienteWhatsapp: string; data: string; horario: string; status: Appointment["status"]; recorrencia?: { frequency: RecurrenceFrequency; occurrences: number } }) => Promise<boolean>;
  readonly onDelete: (id: string) => Promise<void>;
  readonly onDeleteSeries: (recorrenciaId: string) => Promise<void>;
}) {
  const [form, setForm] = useState(() => EMPTY_FORM(professionals, services));
  const [filters, setFilters] = useState({ search: "", status: "todos", professional: "todos", date: "" });
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  function updateFilter(next: Partial<typeof filters>) {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(0);
  }

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = `${appointment.pacienteNome} ${appointment.profissional} ${appointment.servico}`.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "todos" || appointment.status === filters.status;
    const matchesProfessional = filters.professional === "todos" || appointment.profissional === professionals.find((item) => item.id === filters.professional)?.nome;
    const matchesDate = !filters.date || appointment.data === filters.date;
    return matchesSearch && matchesStatus && matchesProfessional && matchesDate;
  });

  const paginatedAppointments = usePagination(filteredAppointments, page, pageSize);

  const recurrenceDates = useMemo(() => {
    if (form.id || form.recorrenciaFrequency === "none") return [form.data];
    return buildRecurringDates(form.data, form.recorrenciaFrequency, form.recorrenciaOccurrences);
  }, [form.data, form.id, form.recorrenciaFrequency, form.recorrenciaOccurrences]);

  const recurrenceConflicts = useMemo(() => {
    if (form.id || form.recorrenciaFrequency === "none") return [];
    return recurrenceDates.filter((date) => appointments.some((appointment) =>
      appointment.profissionalId === form.profissionalId &&
      appointment.data === date &&
      appointment.horario === form.horario &&
      appointment.status !== "cancelado"
    ));
  }, [appointments, form.horario, form.id, form.profissionalId, form.recorrenciaFrequency, recurrenceDates]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!form.profissionalId) { setLocalError("Selecione um profissional."); return; }
    if ((form.pacienteNome || "").trim().length < 3) { setLocalError("Informe o nome do paciente (mín. 3 caracteres)."); return; }
    if (!form.id && form.recorrenciaFrequency !== "none" && recurrenceConflicts.length > 0) {
      setLocalError(`Já existe agendamento para este profissional/horário em: ${recurrenceConflicts.slice(0, 4).map((date) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR")).join(", ")}.`);
      return;
    }
    setSaving(true);
    try {
      const ok = await onSave({
        id: form.id || undefined,
        profissionalId: form.profissionalId,
        servicoId: form.servicoId || null,
        pacienteId: form.pacienteId || null,
        pacienteNome: form.pacienteNome.trim() || "Paciente",
        pacienteWhatsapp: form.pacienteWhatsapp,
        data: form.data,
        horario: form.horario,
        status: form.status,
        recorrencia: form.id ? undefined : { frequency: form.recorrenciaFrequency, occurrences: form.recorrenciaOccurrences },
      });
      if (ok) setForm(EMPTY_FORM(professionals, services));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Agendamentos" description="Agenda operacional filtrada pela clínica logada.">
      {/* Filtros */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Buscar">
          <input className={inputClass()} placeholder="Paciente, profissional ou serviço" value={filters.search} onChange={(e) => updateFilter({ search: e.target.value })} />
        </Field>
        <Field label="Status">
          <select className={inputClass()} value={filters.status} onChange={(e) => updateFilter({ status: e.target.value })}>
            <option value="todos">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="confirmado">Confirmado</option>
            <option value="concluido">Concluído</option>
            <option value="faltou">Faltou</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </Field>
        <Field label="Profissional">
          <select className={inputClass()} value={filters.professional} onChange={(e) => updateFilter({ professional: e.target.value })}>
            <option value="todos">Todos</option>
            {professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}
          </select>
        </Field>
        <Field label="Data">
          <input className={inputClass()} type="date" value={filters.date} onChange={(e) => updateFilter({ date: e.target.value })} />
        </Field>
      </div>

      {/* Formulário */}
      {localError && (
        <div className="mb-3 rounded-lg border border-error/30 bg-red-50 px-4 py-2.5 text-sm font-medium text-error">
          {localError}
        </div>
      )}
      <form className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => { void handleSubmit(e); }}>
        <Field label="Paciente cadastrado">
          <PatientSearch
            patients={patients}
            selectedId={form.pacienteId}
            onSelect={(id, nome, whatsapp) => setForm((f) => ({ ...f, pacienteId: id, pacienteNome: nome, pacienteWhatsapp: whatsapp }))}
          />
        </Field>
        <Field label="Nome avulso">
          <input className={inputClass()} placeholder="Ou digite um nome livre" value={form.pacienteNome} onChange={(e) => setForm({ ...form, pacienteNome: e.target.value })} />
        </Field>
        <Field label="WhatsApp">
          <input className={inputClass()} value={form.pacienteWhatsapp} onChange={(e) => setForm({ ...form, pacienteWhatsapp: e.target.value })} />
        </Field>
        <Field label="Profissional">
          <select className={inputClass()} value={form.profissionalId} onChange={(e) => setForm({ ...form, profissionalId: e.target.value })}>
            {professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}
          </select>
        </Field>
        <Field label="Serviço">
          <select className={inputClass()} value={form.servicoId} onChange={(e) => setForm({ ...form, servicoId: e.target.value })}>
            {services.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}
          </select>
        </Field>
        <Field label="Data">
          <input className={inputClass()} type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
        </Field>
        <Field label="Horário">
          <input className={inputClass()} type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
        </Field>
        <Field label="Status">
          <select className={inputClass()} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Appointment["status"] })}>
            <option value="pendente">Pendente</option>
            <option value="confirmado">Confirmado</option>
            <option value="concluido">Concluído</option>
            <option value="faltou">Faltou</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </Field>
        <Field label="Recorrência">
          <select
            className={inputClass()}
            disabled={Boolean(form.id)}
            value={form.recorrenciaFrequency}
            onChange={(e) => setForm({ ...form, recorrenciaFrequency: e.target.value as RecurrenceFrequency })}
          >
            <option value="none">Não repetir</option>
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quinzenal</option>
            <option value="monthly">Mensal</option>
          </select>
        </Field>
        <Field label="Quantidade">
          <input
            className={inputClass()}
            disabled={Boolean(form.id) || form.recorrenciaFrequency === "none"}
            max={24}
            min={2}
            type="number"
            value={form.recorrenciaOccurrences}
            onChange={(e) => setForm({ ...form, recorrenciaOccurrences: Math.min(24, Math.max(2, Number(e.target.value) || 2)) })}
          />
        </Field>
        {!form.id && form.recorrenciaFrequency !== "none" ? (
          <div className="rounded-lg border border-primary/20 bg-primary-soft px-3 py-2 text-xs text-primary-dark sm:col-span-2 lg:col-span-2">
            Série com {recurrenceDates.length} horários: {recurrenceDates.slice(0, 4).map((date) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR")).join(", ")}
            {recurrenceDates.length > 4 ? "..." : ""}
          </div>
        ) : null}
        <button className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed sm:col-span-2 lg:col-span-4" type="submit" disabled={saving}>
          {saving ? "Salvando..." : form.id ? "Atualizar" : form.recorrenciaFrequency === "none" ? "Salvar" : "Criar série recorrente"}
        </button>
      </form>

      <ClinicCalendar appointments={filteredAppointments} professionals={professionals} />

      {filteredAppointments.length === 0
        ? <EmptyState title="Sem agendamentos" message="Agendamentos públicos e internos aparecerão aqui." />
        : (
          <RefinedTable headers={["Paciente", "Profissional", "Serviço", "Data", "Status", "Ações"]}>
            {paginatedAppointments.items.map((appointment) => (
              <tr className="border-b border-surface-variant hover:bg-teal-50/60 transition" key={appointment.id}>
                <td className="px-4 py-3 font-medium">{appointment.pacienteNome}</td>
                <td className="px-4 py-3 text-secondary">{appointment.profissional}</td>
                <td className="px-4 py-3 text-secondary">{appointment.servico}</td>
                <td className="px-4 py-3 text-secondary">{new Date(`${appointment.data}T12:00:00`).toLocaleDateString("pt-BR")} {appointment.horario}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill value={appointment.status} />
                    {appointment.recorrenciaId ? (
                      <span className="rounded-full border border-primary/20 bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                        Série
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="mr-2 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary transition"
                    onClick={() => setForm({
                      id: appointment.id,
                      profissionalId: professionals.find((item) => item.nome === appointment.profissional)?.id ?? "",
                      servicoId: services.find((item) => item.nome === appointment.servico)?.id ?? "",
                      pacienteId: "",
                      pacienteNome: appointment.pacienteNome,
                      pacienteWhatsapp: "",
                      data: appointment.data,
                      horario: appointment.horario,
                      status: appointment.status,
                      recorrenciaFrequency: "none",
                      recorrenciaOccurrences: 4,
                    })}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    aria-label={`Excluir agendamento de ${appointment.pacienteNome}`}
                    className="rounded-lg p-1.5 text-secondary hover:bg-red-50 hover:text-error transition"
                    onClick={() => void confirmDangerAction(`Tem certeza que deseja excluir este agendamento de ${appointment.pacienteNome}? Essa ação não pode ser desfeita.`).then((ok) => { if (ok) onDelete(appointment.id); })}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {appointment.recorrenciaId ? (
                    <button
                      className="ml-2 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium hover:border-error hover:text-error transition"
                      onClick={() => void confirmDangerAction(`Excluir toda a série recorrente de ${appointment.pacienteNome}? Todos os horários vinculados serão removidos.`).then((ok) => { if (ok && appointment.recorrenciaId) onDeleteSeries(appointment.recorrenciaId); })}
                      type="button"
                    >
                      Excluir série
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </RefinedTable>
        )
      }
      {filteredAppointments.length > 0 && (
        <Pagination
          total={filteredAppointments.length}
          page={paginatedAppointments.page}
          pageSize={pageSize}
          onPage={(p) => setPage(p)}
          onPageSize={(s) => { setPageSize(s); setPage(0); }}
        />
      )}
    </SectionCard>
  );
}
