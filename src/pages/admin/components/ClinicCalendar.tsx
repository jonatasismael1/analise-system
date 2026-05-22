import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment, Professional } from "../../../types/clinic";
import { todayISO } from "../../../lib/formatters";
import { inputClass } from "./Field";

// ── Grid constants ─────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64; // px per hour slot
const START_HOUR = 8;
const END_HOUR = 18;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT;

// ── Date helpers ───────────────────────────────────────────────────────────────
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  return addDays(d, diff).toISOString().slice(0, 10);
}

function formatPeriod(start: string, end: string): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  return `${fmt(start)} até ${fmt(end)}`;
}

function apptTopPx(horario: string): number {
  const [h, m] = horario.split(":").map(Number);
  return ((h - START_HOUR) + m / 60) * HOUR_HEIGHT;
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<Appointment["status"], { card: string; dot: string }> = {
  confirmado: { card: "bg-teal-50 border-l-4 border-l-teal-500 border-y-teal-200 border-r-teal-200 text-teal-900",  dot: "bg-teal-500"   },
  concluido:  { card: "bg-blue-50 border-l-4 border-l-blue-500 border-y-blue-200 border-r-blue-200 text-blue-900",  dot: "bg-blue-500"   },
  pendente:   { card: "bg-amber-50 border-l-4 border-l-amber-500 border-y-amber-200 border-r-amber-200 text-amber-900", dot: "bg-amber-400" },
  faltou:     { card: "bg-red-50 border-l-4 border-l-red-500 border-y-red-200 border-r-red-200 text-red-900",     dot: "bg-red-500"    },
  cancelado:  { card: "bg-slate-50 border-l-4 border-l-slate-300 border-y-slate-200 border-r-slate-200 text-slate-500 opacity-60", dot: "bg-slate-400" },
};

// ── Appointment card ───────────────────────────────────────────────────────────
function ApptCard({
  appointment,
  onClick,
}: {
  readonly appointment: Appointment;
  readonly onClick?: () => void;
}) {
  const { card, dot } = STATUS_STYLE[appointment.status];
  const top = apptTopPx(appointment.horario);

  return (
    <div
      className={`absolute left-1 right-1 overflow-hidden rounded-lg border p-2 shadow-sm transition-all ${card} ${
        onClick ? "cursor-pointer hover:shadow-md hover:brightness-95" : ""
      }`}
      style={{ top, height: HOUR_HEIGHT - 6, zIndex: 1 }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        <span className="truncate text-[11px] font-bold">{appointment.horario}</span>
      </div>
      <p className="mt-0.5 truncate text-[11px] font-semibold leading-tight">{appointment.pacienteNome}</p>
      {appointment.servico && (
        <p className="truncate text-[10px] opacity-70 leading-tight">{appointment.servico}</p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
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
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        addDays(new Date(`${weekStart}T12:00:00`), i).toISOString().slice(0, 10),
      ),
    [weekStart],
  );

  const filtered = useMemo(
    () =>
      appointments.filter((a) => {
        const profName = professionals.find((p) => p.id === professionalId)?.nome;
        return (
          (professionalId === "todos" || a.profissional === profName) &&
          (status === "todos" || a.status === status) &&
          a.data >= week[0] &&
          a.data <= week[6]
        );
      }),
    [appointments, professionals, professionalId, status, week],
  );

  const today = todayISO();
  const prev7 = () =>
    setAnchorDate(addDays(new Date(`${weekStart}T12:00:00`), -7).toISOString().slice(0, 10));
  const next7 = () =>
    setAnchorDate(addDays(new Date(`${weekStart}T12:00:00`), 7).toISOString().slice(0, 10));

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-card">

      {/* ── Header / Controls ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Agenda da semana
          </p>
          <h3 className="mt-0.5 text-[15px] font-semibold text-ink">Calendário operacional</h3>
          <p className="mt-0.5 text-[11px] capitalize text-ink-secondary">
            {formatPeriod(week[0], week[6])}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            className={inputClass()}
            style={{ width: 130 }}
            type="date"
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
          />
          <select
            className={inputClass()}
            style={{ width: 148 }}
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
          >
            <option value="todos">Todos</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <select
            className={inputClass()}
            style={{ width: 130 }}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="todos">Todos os status</option>
            <option value="confirmado">Confirmado</option>
            <option value="pendente">Pendente</option>
            <option value="concluido">Concluído</option>
            <option value="faltou">Faltou</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <div className="flex items-center gap-1">
            <button
              className="h-9 rounded-lg border border-border px-3 text-xs font-medium text-ink-secondary transition hover:border-primary hover:text-primary"
              type="button"
              onClick={() => setAnchorDate(today)}
            >
              Hoje
            </button>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-secondary transition hover:border-primary hover:text-primary"
              type="button"
              onClick={prev7}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-primary-dark"
              type="button"
              onClick={next7}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 640 }}>

          {/* Day headers row */}
          <div className="flex border-b border-border bg-surface-low">
            {/* spacer for hour column */}
            <div className="w-14 shrink-0 border-r border-border" />
            {week.map((date) => {
              const d = new Date(`${date}T12:00:00`);
              const isToday = date === today;
              const weekday = d
                .toLocaleDateString("pt-BR", { weekday: "short" })
                .replace(".", "")
                .toUpperCase();
              const dayNum = d.getDate();
              return (
                <div
                  key={date}
                  className={`flex flex-1 flex-col items-center gap-1 py-2.5 ${isToday ? "bg-primary/5" : ""}`}
                >
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest ${
                      isToday ? "text-primary" : "text-ink-muted"
                    }`}
                  >
                    {weekday}
                  </span>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold ${
                      isToday ? "bg-primary text-white shadow-sm" : "text-ink"
                    }`}
                  >
                    {dayNum}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grid body: hours + day columns */}
          <div className="flex" style={{ height: TOTAL_HEIGHT }}>

            {/* Hours column */}
            <div className="relative w-14 shrink-0 border-r border-border bg-surface-low/50">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-2 text-[10px] font-medium text-ink-muted"
                  style={{ top: (hour - START_HOUR) * HOUR_HEIGHT + 4 }}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {week.map((date) => {
              const dayAppts = filtered
                .filter((a) => a.data === date)
                .sort((a, b) => a.horario.localeCompare(b.horario));
              const isToday = date === today;
              return (
                <div
                  key={date}
                  className={`relative flex-1 border-l border-border/40 ${
                    isToday ? "bg-primary/[0.025]" : ""
                  }`}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-border/30"
                      style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                    />
                  ))}
                  {/* Half-hour dashed lines */}
                  {HOURS.map((hour) => (
                    <div
                      key={`${hour}-half`}
                      className="absolute left-0 right-0 border-t border-dashed border-border/15"
                      style={{ top: (hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                    />
                  ))}
                  {/* Appointment cards */}
                  {dayAppts.map((appt) => (
                    <ApptCard
                      key={appt.id}
                      appointment={appt}
                      onClick={onClickAppointment ? () => onClickAppointment(appt) : undefined}
                    />
                  ))}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* ── Legend ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 border-t border-border px-5 py-3">
        {(["confirmado", "pendente", "concluido", "faltou", "cancelado"] as Appointment["status"][]).map(
          (s) => (
            <span key={s} className="flex items-center gap-1.5 text-[10px] text-ink-secondary">
              <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[s].dot}`} />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          ),
        )}
        <span className="ml-auto text-[10px] text-ink-muted">
          {filtered.length} agendamento{filtered.length !== 1 ? "s" : ""} na semana
        </span>
      </div>
    </div>
  );
}
