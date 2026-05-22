import { useMemo, useState } from "react";
import { CalendarCheck, Clock, History, TrendingUp, Users, Wallet } from "lucide-react";
import { SectionCard } from "../../../components/ui/SectionCard";
import { brl, todayISO } from "../../../lib/formatters";
import type { Appointment, FinanceEntry, Patient, Professional, UserRole } from "../../../types/clinic";
import { StatusPill } from "../components/StatusPill";

type PeriodMode = "day" | "week" | "month" | "max" | "custom";

interface KpiCard {
  label: string;
  value: string;
  detail: string;
  accentClass: string;
  bgAccent: string;
  Icon: React.ComponentType<{ className?: string }>;
}

function toISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function weekBounds(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toISO(start), end: toISO(end) };
}

function monthBounds(date = new Date()) {
  return {
    start: toISO(new Date(date.getFullYear(), date.getMonth(), 1)),
    end: toISO(new Date(date.getFullYear(), date.getMonth() + 1, 0))
  };
}

function getRange(mode: PeriodMode, customStart: string, customEnd: string) {
  const today = todayISO();
  if (mode === "day") return { start: today, end: today, label: "Hoje" };
  if (mode === "week") return { ...weekBounds(), label: "Semana" };
  if (mode === "month") return { ...monthBounds(), label: "Mês" };
  if (mode === "custom") return { start: customStart || today, end: customEnd || customStart || today, label: "Personalizado" };
  return { start: "", end: "", label: "Máximo" };
}

function inRange(date: string | null | undefined, start: string, end: string) {
  if (!date) return false;
  if (!start && !end) return true;
  return (!start || date >= start) && (!end || date <= end);
}

function chartFromAppointments(appointments: Appointment[]) {
  const grouped = new Map<string, number>();
  appointments.forEach((appointment) => {
    grouped.set(appointment.data, (grouped.get(appointment.data) ?? 0) + 1);
  });
  const entries = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  const sliced = entries.length > 10 ? entries.slice(-10) : entries;
  const max = Math.max(...sliced.map(([, count]) => count), 1);
  return sliced.map(([date, count]) => ({
    label: new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    count,
    height: Math.max(10, Math.round((count / max) * 100))
  }));
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function appointmentTime(value: Appointment) {
  return `${value.data}T${value.horario}`;
}

function ProfessionalDashboard({
  appointments,
  patients,
  financeEntries,
}: {
  readonly appointments: Appointment[];
  readonly patients: Patient[];
  readonly financeEntries: FinanceEntry[];
}) {
  const today = todayISO();
  const month = monthBounds();

  const todayAppointments = useMemo(() => appointments
    .filter((appointment) => appointment.data === today && appointment.status !== "cancelado")
    .sort((a, b) => a.horario.localeCompare(b.horario)), [appointments, today]);

  const nextTodayAppointments = todayAppointments.filter((appointment) =>
    ["pendente", "confirmado"].includes(appointment.status)
  );

  const completedAppointments = useMemo(() => appointments
    .filter((appointment) => appointment.status === "concluido")
    .sort((a, b) => appointmentTime(b).localeCompare(appointmentTime(a))), [appointments]);

  const patientHistory = useMemo(() => {
    const byPatient = new Map<string, { name: string; lastDate: string; lastService: string; count: number }>();
    completedAppointments.forEach((appointment) => {
      const key = appointment.pacienteId ?? appointment.pacienteNome.toLowerCase();
      const current = byPatient.get(key);
      if (!current) {
        byPatient.set(key, {
          name: appointment.pacienteNome,
          lastDate: appointment.data,
          lastService: appointment.servico,
          count: 1
        });
        return;
      }
      current.count += 1;
      if (appointment.data > current.lastDate) {
        current.lastDate = appointment.data;
        current.lastService = appointment.servico;
      }
    });
    return [...byPatient.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate)).slice(0, 8);
  }, [completedAppointments]);

  const revenue = useMemo(() => {
    const monthEntries = financeEntries.filter((entry) =>
      entry.tipo !== "despesa" &&
      inRange(entry.data, month.start, month.end)
    );
    const paid = monthEntries
      .filter((entry) => entry.status === "pago")
      .reduce((sum, entry) => sum + entry.valor, 0);
    const forecast = monthEntries
      .filter((entry) => entry.status !== "cancelado")
      .reduce((sum, entry) => sum + entry.valor, 0);
    return { paid, forecast };
  }, [financeEntries, month.end, month.start]);

  const activePatients = patients.filter((patient) => patient.status === "ativo").length;
  const cards: KpiCard[] = [
    {
      label: "Atendimentos hoje",
      value: todayAppointments.length.toString(),
      detail: `${nextTodayAppointments.length} ainda pendente(s)`,
      accentClass: "border-l-primary text-primary",
      bgAccent: "bg-primary-wash",
      Icon: CalendarCheck,
    },
    {
      label: "Proximos do dia",
      value: nextTodayAppointments.length.toString(),
      detail: nextTodayAppointments[0] ? `as ${nextTodayAppointments[0].horario}` : "agenda livre",
      accentClass: "border-l-[#4A8FBB] text-[#4A8FBB]",
      bgAccent: "bg-[#EDF4FA]",
      Icon: Clock,
    },
    {
      label: "Pacientes atendidos",
      value: patientHistory.length.toString(),
      detail: `${activePatients} pacientes ativos`,
      accentClass: "border-l-success text-success",
      bgAccent: "bg-success-wash",
      Icon: History,
    },
    {
      label: "Receita propria",
      value: brl.format(revenue.paid),
      detail: `${brl.format(revenue.forecast)} previsto no mes`,
      accentClass: "border-l-primary text-primary",
      bgAccent: "bg-primary-wash",
      Icon: Wallet,
    },
  ];

  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, accentClass, bgAccent, Icon }) => (
          <div
            className={`group relative overflow-hidden rounded-lg border-l-[3px] bg-surface shadow-card transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(25,40,39,0.10)] ${accentClass.split(" ")[0]}`}
            key={label}
          >
            <div className={`absolute right-4 top-4 rounded-lg p-2 ${bgAccent}`}>
              <Icon className={`h-4 w-4 ${accentClass.split(" ")[1]}`} />
            </div>
            <div className="px-5 pb-5 pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">{label}</p>
              <p className="mt-2 font-mono text-[28px] font-bold tabular-nums leading-none tracking-tight text-ink">{value}</p>
              <p className={`mt-2 text-[12px] font-medium ${accentClass.split(" ")[1]}`}>{detail}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Proximos atendimentos de hoje" description={todayAppointments.length ? `${formatDate(today)} · agenda propria` : "Nenhum atendimento para hoje."}>
          {todayAppointments.length ? (
            <div className="space-y-3">
              {todayAppointments.map((appointment) => (
                <div className="flex flex-col justify-between gap-3 rounded-lg border border-surface-variant bg-surface-container-lowest p-3 md:flex-row md:items-center" key={appointment.id}>
                  <div>
                    <p className="font-semibold text-ink">{appointment.horario} · {appointment.pacienteNome}</p>
                    <p className="mt-1 text-sm text-secondary">{appointment.servico}</p>
                  </div>
                  <StatusPill value={appointment.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[180px] items-center justify-center text-sm text-secondary">
              Agenda livre para hoje.
            </div>
          )}
        </SectionCard>

        <SectionCard title="Receita do mes" description={`${month.start} ate ${month.end}`}>
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-primary-dark">Receita paga</p>
              <p className="mt-2 text-3xl font-bold text-ink">{brl.format(revenue.paid)}</p>
            </div>
            <div className="rounded-lg border border-surface-variant p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">Receita prevista</p>
              <p className="mt-2 text-xl font-bold text-ink">{brl.format(revenue.forecast)}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Historico recente de pacientes" description="Ultimos pacientes atendidos por voce, com base em agendamentos concluidos.">
        {patientHistory.length ? (
          <div className="overflow-hidden rounded-lg border border-surface-variant">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-lowest text-left text-xs uppercase tracking-[0.05em] text-secondary">
                <tr>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Ultimo atendimento</th>
                  <th className="px-4 py-3">Servico</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {patientHistory.map((patient) => (
                  <tr className="border-t border-surface-variant" key={`${patient.name}-${patient.lastDate}`}>
                    <td className="px-4 py-3 font-medium text-ink">{patient.name}</td>
                    <td className="px-4 py-3 text-secondary">{formatDate(patient.lastDate)}</td>
                    <td className="px-4 py-3 text-secondary">{patient.lastService}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{patient.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-[160px] items-center justify-center text-sm text-secondary">
            Nenhum atendimento concluido encontrado.
          </div>
        )}
      </SectionCard>
    </>
  );
}

export function DashboardPanel({
  appointments,
  professionals,
  patients,
  financeEntries,
  insightsCount,
  role,
}: {
  readonly appointments: Appointment[];
  readonly professionals: Professional[];
  readonly patients: Patient[];
  readonly financeEntries: FinanceEntry[];
  readonly kpis: { revenue: number; forecast: number; overdue: number; profit: number };
  readonly insightsCount: number;
  readonly role: UserRole;
}) {
  const today = todayISO();
  const [periodMode, setPeriodMode] = useState<PeriodMode>("day");
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);

  const range = getRange(periodMode, customStart, customEnd);
  const filteredAppointments = useMemo(() => appointments.filter((appointment) => inRange(appointment.data, range.start, range.end)), [appointments, range.end, range.start]);
  const filteredFinance = useMemo(() => financeEntries.filter((entry) => inRange(entry.data, range.start, range.end)), [financeEntries, range.end, range.start]);

  const periodKpis = useMemo(() => {
    const revenue = filteredFinance.filter((entry) => entry.tipo !== "despesa" && entry.status === "pago").reduce((sum, entry) => sum + entry.valor, 0);
    const expenses = filteredFinance.filter((entry) => entry.tipo === "despesa" && entry.status !== "cancelado").reduce((sum, entry) => sum + entry.valor, 0);
    const overdue = filteredFinance.filter((entry) => entry.status === "atrasado").reduce((sum, entry) => sum + entry.valor, 0);
    const forecast = filteredFinance.filter((entry) => entry.tipo !== "despesa" && entry.status !== "cancelado").reduce((sum, entry) => sum + entry.valor, 0);
    return { revenue, expenses, overdue, forecast, profit: revenue - expenses };
  }, [filteredFinance]);

  const occupation = Math.min(
    100,
    Math.round((filteredAppointments.filter((a) => a.status === "confirmado" || a.status === "concluido").length / Math.max(professionals.length * 8, 1)) * 100),
  );
  const chartItems = chartFromAppointments(filteredAppointments);

  const cards: KpiCard[] = [
    {
      label: "Consultas",
      value: filteredAppointments.length.toString(),
      detail: `${range.label.toLowerCase()} selecionado`,
      accentClass: "border-l-primary text-primary",
      bgAccent: "bg-primary-wash",
      Icon: CalendarCheck,
    },
    {
      label: "Ocupação",
      value: `${occupation}%`,
      detail: "estimativa do período",
      accentClass: "border-l-[#4A8FBB] text-[#4A8FBB]",
      bgAccent: "bg-[#EDF4FA]",
      Icon: TrendingUp,
    },
    {
      label: "Profissionais Ativos",
      value: professionals.filter((p) => p.ativo).length.toString(),
      detail: "em operação",
      accentClass: "border-l-success text-success",
      bgAccent: "bg-success-wash",
      Icon: Users,
    },
    role === "admin"
      ? {
          label: "Receita Prevista",
          value: brl.format(periodKpis.forecast),
          detail: periodKpis.overdue > 0 ? `${brl.format(periodKpis.overdue)} em atraso` : "sem pendências",
          accentClass: periodKpis.overdue > 0 ? "border-l-danger text-danger" : "border-l-primary text-primary",
          bgAccent: periodKpis.overdue > 0 ? "bg-danger-wash" : "bg-primary-wash",
          Icon: Wallet,
        }
      : {
          label: "Pacientes Ativos",
          value: patients.filter((patient) => patient.status === "ativo").length.toString(),
          detail: role === "profissional" ? "sob seus cuidados" : "em acompanhamento",
          accentClass: "border-l-primary text-primary",
          bgAccent: "bg-primary-wash",
          Icon: Wallet,
        },
  ];

  if (role === "profissional") {
    return (
      <ProfessionalDashboard
        appointments={appointments}
        patients={patients}
        financeEntries={financeEntries}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-surface-variant bg-surface p-4 shadow-card lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Período do dashboard</p>
          <p className="mt-1 text-sm text-secondary">Os números começam em hoje e podem ser filtrados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ["day", "Hoje"],
            ["week", "Semana"],
            ["month", "Mês"],
            ["max", "Máximo"],
            ["custom", "Personalizado"],
          ] as const).map(([value, label]) => (
            <button
              className={`h-9 rounded-lg border px-3 text-sm font-medium transition ${periodMode === value ? "border-primary bg-primary text-white" : "border-outline-variant text-secondary hover:border-primary hover:text-primary"}`}
              key={value}
              onClick={() => setPeriodMode(value)}
              type="button"
            >
              {label}
            </button>
          ))}
          {periodMode === "custom" ? (
            <>
              <input className="h-9 rounded-lg border border-outline-variant px-3 text-sm" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
              <input className="h-9 rounded-lg border border-outline-variant px-3 text-sm" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
            </>
          ) : null}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, accentClass, bgAccent, Icon }) => (
          <div
            className={`group relative overflow-hidden rounded-lg border-l-[3px] bg-surface shadow-card transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(25,40,39,0.10)] ${accentClass.split(" ")[0]}`}
            key={label}
          >
            <div className={`absolute right-4 top-4 rounded-lg p-2 ${bgAccent}`}>
              <Icon className={`h-4 w-4 ${accentClass.split(" ")[1]}`} />
            </div>
            <div className="px-5 pb-5 pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">{label}</p>
              <p className="mt-2 font-mono text-[28px] font-bold tabular-nums leading-none tracking-tight text-ink">{value}</p>
              <p className={`mt-2 text-[12px] font-medium ${accentClass.split(" ")[1]}`}>{detail}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="col-span-2">
          <SectionCard title="Agenda no período" description={range.start ? `${range.start} até ${range.end}` : "Todos os registros carregados"}>
            {chartItems.length ? (
              <div className="flex h-[220px] items-end gap-2">
                {chartItems.map((item) => (
                  <div className="flex flex-1 flex-col items-center gap-1.5" key={item.label}>
                    <div
                      className="w-full rounded-t-md bg-primary/70 transition-all duration-200 hover:bg-primary"
                      style={{ height: `${item.height}%` }}
                      title={`${item.count} consulta(s)`}
                    />
                    <span className="text-[10px] font-medium text-ink-muted">{item.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-secondary">
                Nenhum agendamento no período selecionado.
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Deby AI">
          <div className="flex h-full flex-col justify-between gap-4">
            <div>
              <p className="font-mono text-[48px] font-bold tabular-nums leading-none tracking-tight text-ink">{insightsCount}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
                Oportunidades detectadas entre agenda, pacientes e financeiro.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill value={patients.filter((p) => p.status !== "ativo").length ? "retorno_pendente" : "ativo"} />
              <span className="text-[11px] text-ink-muted">IA operacional</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
