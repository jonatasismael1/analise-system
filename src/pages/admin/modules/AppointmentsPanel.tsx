import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
import { todayISO } from "../../../lib/formatters";
import type { Appointment, Patient, Professional, Service } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";
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
});

export function AppointmentsPanel({ appointments, patients, professionals, services, onSave, onDelete }: {
  readonly appointments: Appointment[];
  readonly patients: Patient[];
  readonly professionals: Professional[];
  readonly services: Service[];
  readonly onSave: (values: { profissionalId: string; servicoId?: string | null; pacienteId?: string | null; pacienteNome: string; pacienteWhatsapp: string; data: string; horario: string; status: Appointment["status"] }) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState(() => EMPTY_FORM(professionals, services));
  const [filters, setFilters] = useState({ search: "", status: "todos", professional: "todos", date: "" });

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = `${appointment.pacienteNome} ${appointment.profissional} ${appointment.servico}`.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "todos" || appointment.status === filters.status;
    const matchesProfessional = filters.professional === "todos" || appointment.profissional === professionals.find((item) => item.id === filters.professional)?.nome;
    const matchesDate = !filters.date || appointment.data === filters.date;
    return matchesSearch && matchesStatus && matchesProfessional && matchesDate;
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void onSave({
      ...form,
      pacienteNome: form.pacienteNome || "Paciente",
      pacienteWhatsapp: form.pacienteWhatsapp,
    });
    setForm(EMPTY_FORM(professionals, services));
  }

  return (
    <SectionCard title="Agendamentos" description="Agenda operacional filtrada pela clínica logada.">
      {/* Filtros */}
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Field label="Buscar">
          <input className={inputClass()} placeholder="Paciente, profissional ou serviço" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        </Field>
        <Field label="Status">
          <select className={inputClass()} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="todos">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="confirmado">Confirmado</option>
            <option value="concluido">Concluído</option>
            <option value="faltou">Faltou</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </Field>
        <Field label="Profissional">
          <select className={inputClass()} value={filters.professional} onChange={(e) => setFilters({ ...filters, professional: e.target.value })}>
            <option value="todos">Todos</option>
            {professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}
          </select>
        </Field>
        <Field label="Data">
          <input className={inputClass()} type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        </Field>
      </div>

      {/* Formulário */}
      <form className="mb-5 grid gap-3 md:grid-cols-4 xl:grid-cols-8" onSubmit={handleSubmit}>
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
        <button className="mt-5 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark transition" type="submit">
          {form.id ? "Atualizar" : "Salvar"}
        </button>
      </form>

      <ClinicCalendar appointments={filteredAppointments} professionals={professionals} />

      {filteredAppointments.length === 0
        ? <EmptyState title="Sem agendamentos" message="Agendamentos públicos e internos aparecerão aqui." />
        : (
          <RefinedTable headers={["Paciente", "Profissional", "Serviço", "Data", "Status", "Ações"]}>
            {filteredAppointments.map((appointment) => (
              <tr className="border-b border-surface-variant hover:bg-teal-50/60 transition" key={appointment.id}>
                <td className="px-4 py-3 font-medium">{appointment.pacienteNome}</td>
                <td className="px-4 py-3 text-secondary">{appointment.profissional}</td>
                <td className="px-4 py-3 text-secondary">{appointment.servico}</td>
                <td className="px-4 py-3 text-secondary">{new Date(`${appointment.data}T12:00:00`).toLocaleDateString("pt-BR")} {appointment.horario}</td>
                <td className="px-4 py-3"><StatusPill value={appointment.status} /></td>
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
                    })}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    aria-label={`Excluir agendamento de ${appointment.pacienteNome}`}
                    className="rounded-lg p-1.5 text-secondary hover:bg-red-50 hover:text-error transition"
                    onClick={() => { if (confirmDangerAction(`Tem certeza que deseja excluir este agendamento de ${appointment.pacienteNome}? Essa ação não pode ser desfeita.`)) void onDelete(appointment.id); }}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </RefinedTable>
        )
      }
    </SectionCard>
  );
}
