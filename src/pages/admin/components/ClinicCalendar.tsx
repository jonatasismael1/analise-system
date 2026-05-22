import { useMemo, useState } from "react";
import type { Appointment, Professional } from "../../../types/clinic";
import { EmptyState } from "../../../components/ui/EmptyState";
import { todayISO } from "../../../lib/formatters";
import { Field, inputClass } from "./Field";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff).toISOString().slice(0, 10);
}

function formatDay(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

const statusCardClass: Record<Appointment["status"], string> = {
  confirmado: "border-teal-200 bg-teal-50 text-primary",
  concluido: "border-blue-200 bg-blue-50 text-blue-700",
  pendente: "border-amber-200 bg-amber-50 text-amber-700",
  faltou: "border-red-200 bg-red-50 text-error",
  cancelado: "border-slate-200 bg-slate-100 text-secondary",
};

const statusDotClass: Record<Appointment["status"], string> = {
  confirmado: "bg-teal-500",
  concluido: "bg-blue-500",
  pendente: "bg-amber-400",
  faltou: "bg-red-500",
  cancelado: "bg-slate-400",
};

interface ClinicCalendarProps {
  readonly appointments: Appointment[];
  readonly professionals: Professional[];
  readonly onClickAppointment?: (appointment: Appointment) => void;
}

export function ClinicCalendar({ appointments, professionals, onClickAppointment }: ClinicCalendarProps) {
  const [anchorDate, setAnchorDate] = useState(todayISO());
  const [professionalId, setProfessionalId] = useState("todos");
  const [status, setStatus] = useState<Appointment["status"] | "todos">("todos");
  const weekStart = startOfWeek(anchorDate);
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(new Date(`${weekStart}T12:00:00`), index).toISOString().slice(0, 10)), [weekStart]);

  const filteredAppointments = appointments
    .filter((appointment) => {
      const professionalName = professionals.find((professional) => professional.id === professionalId)?.nome;
      const matchesProfessional = professionalId === "todos" || appointment.profissional === professionalName;
      const matchesStatus = status === "todos" || appointment.status === status;
      const matchesWeek = appointment.data >= week[0] && appointment.data <= week[6];
      return matchesProfessional && matchesStatus && matchesWeek;
    })
    .sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`));

  return (
    <section className="mb-5 rounded-xl border border-surface-variant bg-white p-4 shadow-clinical">
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary">Agenda da semana</p>
          <h3 className="mt-1 text-lg font-semibold text-on-surface">Calendário operacional</h3>
          <p className="mt-1 text-sm text-secondary">{formatDay(week[0])} até {formatDay(week[6])}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Data">
            <input className={inputClass()} type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} />
          </Field>
          <Field label="Profissional">
            <select className={inputClass()} value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}>
              <option value="todos">Todos</option>
              {professionals.map((professional) => <option value={professional.id} key={professional.id}>{professional.nome}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass()} value={status} onChange={(event) => setStatus(event.target.value as Appointment["status"] | "todos")}>
              <option value="todos">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="confirmado">Confirmado</option>
              <option value="concluido">Concluído</option>
              <option value="faltou">Faltou</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </Field>
          <button className="h-10 rounded-lg border border-outline-variant bg-white px-3 text-sm font-semibold text-secondary hover:border-primary hover:text-primary" type="button" onClick={() => setAnchorDate(todayISO())}>Hoje</button>
          <button className="h-10 rounded-lg border border-outline-variant bg-white px-3 text-sm font-semibold text-secondary hover:border-primary hover:text-primary" type="button" onClick={() => setAnchorDate(addDays(new Date(`${weekStart}T12:00:00`), -7).toISOString().slice(0, 10))}>Semana anterior</button>
          <button className="h-10 rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-dark" type="button" onClick={() => setAnchorDate(addDays(new Date(`${weekStart}T12:00:00`), 7).toISOString().slice(0, 10))}>Próxima semana</button>
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <EmptyState title="Semana sem agendamentos" message="Ajuste os filtros ou crie um novo agendamento para preencher a agenda." />
      ) : (
        <div className="overflow-x-auto">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7" style={{ minWidth: "700px" }}>
            {week.map((date) => {
              const dayAppointments = filteredAppointments.filter((appointment) => appointment.data === date);
              const isToday = date === todayISO();
              return (
                <div className={`min-h-[190px] rounded-xl border p-3 ${isToday ? "border-primary bg-teal-50/40" : "border-surface-variant bg-surface-container-lowest"}`} key={date}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className={`text-xs font-black uppercase tracking-wide ${isToday ? "text-primary" : "text-secondary"}`}>{formatDay(date)}</p>
                    {isToday ? <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">Hoje</span> : null}
                  </div>
                  <div className="space-y-2">
                    {dayAppointments.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-outline-variant bg-white/70 px-3 py-6 text-center text-xs text-secondary">Sem agenda</p>
                    ) : (
                      dayAppointments.map((appointment) => (
                        <article
                          className={`rounded-lg border p-2.5 text-xs leading-snug ${statusCardClass[appointment.status]} ${onClickAppointment ? "cursor-pointer transition hover:opacity-80 hover:shadow-sm" : ""}`}
                          key={appointment.id}
                          onClick={() => onClickAppointment?.(appointment)}
                          role={onClickAppointment ? "button" : undefined}
                          tabIndex={onClickAppointment ? 0 : undefined}
                          onKeyDown={onClickAppointment ? (e) => { if (e.key === "Enter" || e.key === " ") onClickAppointment(appointment); } : undefined}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-sm font-bold">{appointment.horario}</p>
                            <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass[appointment.status]}`} />
                          </div>
                          <p className="mt-2 font-semibold text-on-surface">{appointment.pacienteNome}</p>
                          <p className="mt-1 text-secondary">{appointment.profissional}</p>
                          <p className="text-secondary">{appointment.servico}</p>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
