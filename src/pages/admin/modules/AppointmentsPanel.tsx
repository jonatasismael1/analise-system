import { useState } from "react";
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

export function AppointmentsPanel({ appointments, patients, professionals, services, onSave, onDelete }: { readonly appointments: Appointment[]; readonly patients: Patient[]; readonly professionals: Professional[]; readonly services: Service[]; readonly onSave: (values: { profissionalId: string; servicoId?: string | null; pacienteId?: string | null; pacienteNome: string; pacienteWhatsapp: string; data: string; horario: string; status: Appointment["status"] }) => Promise<void>; readonly onDelete: (id: string) => Promise<void> }) {
  const [form, setForm] = useState({ id: "", profissionalId: professionals[0]?.id ?? "", servicoId: services[0]?.id ?? "", pacienteId: patients[0]?.id ?? "", pacienteNome: "", pacienteWhatsapp: "", data: todayISO(), horario: "09:00", status: "confirmado" as Appointment["status"] });
  const [filters, setFilters] = useState({ search: "", status: "todos", professional: "todos", date: "" });
  const selectedPatient = patients.find((item) => item.id === form.pacienteId);
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = `${appointment.pacienteNome} ${appointment.profissional} ${appointment.servico}`.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "todos" || appointment.status === filters.status;
    const matchesProfessional = filters.professional === "todos" || appointment.profissional === professionals.find((item) => item.id === filters.professional)?.nome;
    const matchesDate = !filters.date || appointment.data === filters.date;
    return matchesSearch && matchesStatus && matchesProfessional && matchesDate;
  });
  return (
    <SectionCard title="Agendamentos" description="Agenda operacional filtrada pela clinica logada.">
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Field label="Buscar"><input className={inputClass()} placeholder="Paciente, profissional ou serviço" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></Field>
        <Field label="Status"><select className={inputClass()} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="todos">Todos</option><option value="pendente">Pendente</option><option value="confirmado">Confirmado</option><option value="concluido">Concluído</option><option value="faltou">Faltou</option><option value="cancelado">Cancelado</option></select></Field>
        <Field label="Profissional"><select className={inputClass()} value={filters.professional} onChange={(event) => setFilters({ ...filters, professional: event.target.value })}><option value="todos">Todos</option>{professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
        <Field label="Data"><input className={inputClass()} type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} /></Field>
      </div>
      <form className="mb-5 grid gap-3 md:grid-cols-4 xl:grid-cols-8" onSubmit={(event) => { event.preventDefault(); void onSave({ ...form, pacienteNome: form.pacienteNome || selectedPatient?.nome || "Paciente", pacienteWhatsapp: form.pacienteWhatsapp || selectedPatient?.whatsapp || "" }); setForm({ id: "", profissionalId: professionals[0]?.id ?? "", servicoId: services[0]?.id ?? "", pacienteId: patients[0]?.id ?? "", pacienteNome: "", pacienteWhatsapp: "", data: todayISO(), horario: "09:00", status: "confirmado" as Appointment["status"] }); }}>
        <Field label="Paciente"><select className={inputClass()} value={form.pacienteId} onChange={(event) => setForm({ ...form, pacienteId: event.target.value })}>{patients.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
        <Field label="Nome avulso"><input className={inputClass()} value={form.pacienteNome} onChange={(event) => setForm({ ...form, pacienteNome: event.target.value })} /></Field>
        <Field label="WhatsApp"><input className={inputClass()} value={form.pacienteWhatsapp} onChange={(event) => setForm({ ...form, pacienteWhatsapp: event.target.value })} /></Field>
        <Field label="Profissional"><select className={inputClass()} value={form.profissionalId} onChange={(event) => setForm({ ...form, profissionalId: event.target.value })}>{professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
        <Field label="Serviço"><select className={inputClass()} value={form.servicoId} onChange={(event) => setForm({ ...form, servicoId: event.target.value })}>{services.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
        <Field label="Data"><input className={inputClass()} type="date" value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} /></Field>
        <Field label="Horário"><input className={inputClass()} type="time" value={form.horario} onChange={(event) => setForm({ ...form, horario: event.target.value })} /></Field>
        <Field label="Status"><select className={inputClass()} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Appointment["status"] })}><option value="pendente">Pendente</option><option value="confirmado">Confirmado</option><option value="concluido">Concluído</option><option value="faltou">Faltou</option><option value="cancelado">Cancelado</option></select></Field>
        <button className="mt-5 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark transition" type="submit">{form.id ? "Atualizar" : "Salvar"}</button>
      </form>
      <ClinicCalendar appointments={filteredAppointments} professionals={professionals} />
      {filteredAppointments.length === 0 ? <EmptyState title="Sem agendamentos" message="Agendamentos públicos e internos aparecerão aqui." /> : <RefinedTable headers={["Paciente", "Profissional", "Serviço", "Data", "Status", "Ações"]}>{filteredAppointments.map((appointment) => <tr className="border-b border-surface-variant hover:bg-teal-50/60 transition" key={appointment.id}><td className="px-4 py-3 font-medium">{appointment.pacienteNome}</td><td className="px-4 py-3 text-secondary">{appointment.profissional}</td><td className="px-4 py-3 text-secondary">{appointment.servico}</td><td className="px-4 py-3 text-secondary">{new Date(`${appointment.data}T12:00:00`).toLocaleDateString("pt-BR")} {appointment.horario}</td><td className="px-4 py-3"><StatusPill value={appointment.status} /></td><td className="px-4 py-3 text-right"><button className="mr-2 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary transition" onClick={() => setForm({ id: appointment.id, profissionalId: professionals.find((item) => item.nome === appointment.profissional)?.id ?? "", servicoId: services.find((item) => item.nome === appointment.servico)?.id ?? "", pacienteId: "", pacienteNome: appointment.pacienteNome, pacienteWhatsapp: "", data: appointment.data, horario: appointment.horario, status: appointment.status })} type="button">Editar</button><button className="rounded-lg p-1.5 text-secondary hover:bg-red-50 hover:text-error transition" onClick={() => { if (confirmDangerAction(`Excluir o agendamento de ${appointment.pacienteNome}?`)) void onDelete(appointment.id); }} type="button"><Trash2 className="h-4 w-4" /></button></td></tr>)}</RefinedTable>}
    </SectionCard>
  );
}
