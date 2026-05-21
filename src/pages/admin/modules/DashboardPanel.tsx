import { CalendarCheck, TrendingUp, Users, Wallet } from "lucide-react";
import { SectionCard } from "../../../components/ui/SectionCard";
import { brl } from "../../../lib/formatters";
import type { Appointment, Patient, Professional } from "../../../types/clinic";
import { StatusPill } from "../components/StatusPill";

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
const CHART_HEIGHTS = [42, 66, 84, 55, 72, 31, 48];

interface KpiCard {
  label: string;
  value: string;
  detail: string;
  accentClass: string;
  bgAccent: string;
  Icon: React.ComponentType<{ className?: string }>;
}

export function DashboardPanel({
  appointments,
  professionals,
  patients,
  kpis,
  insightsCount,
}: {
  readonly appointments: Appointment[];
  readonly professionals: Professional[];
  readonly patients: Patient[];
  readonly kpis: { revenue: number; forecast: number; overdue: number; profit: number };
  readonly insightsCount: number;
}) {
  const occupation = Math.min(
    100,
    Math.round((appointments.filter((a) => a.status === "confirmado").length / Math.max(professionals.length * 40, 1)) * 100),
  );

  const cards: KpiCard[] = [
    {
      label: "Total de Consultas",
      value: appointments.length.toString(),
      detail: "todos os períodos",
      accentClass: "border-l-primary text-primary",
      bgAccent: "bg-primary-wash",
      Icon: CalendarCheck,
    },
    {
      label: "Ocupação Média",
      value: `${occupation}%`,
      detail: "agenda semanal",
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
    {
      label: "Receita Prevista",
      value: brl.format(kpis.forecast),
      detail: kpis.overdue > 0 ? `${brl.format(kpis.overdue)} em atraso` : "sem pendências",
      accentClass: kpis.overdue > 0 ? "border-l-danger text-danger" : "border-l-primary text-primary",
      bgAccent: kpis.overdue > 0 ? "bg-danger-wash" : "bg-primary-wash",
      Icon: Wallet,
    },
  ];

  return (
    <>
      {/* KPI cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, accentClass, bgAccent, Icon }) => (
          <div
            className={`group relative overflow-hidden rounded-lg border-l-[3px] bg-surface shadow-card transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(25,40,39,0.10)] ${accentClass.split(" ")[0]}`}
            key={label}
          >
            {/* Fundo sutil do ícone */}
            <div className={`absolute right-4 top-4 rounded-lg p-2 ${bgAccent}`}>
              <Icon className={`h-4 w-4 ${accentClass.split(" ")[1]}`} />
            </div>

            <div className="px-5 pb-5 pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">{label}</p>
              <p className="mt-2 font-mono text-[28px] font-bold tabular-nums leading-none tracking-tight text-ink">
                {value}
              </p>
              <p className={`mt-2 text-[12px] font-medium ${accentClass.split(" ")[1]}`}>{detail}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Gráfico + IA */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Gráfico semanal */}
        <div className="col-span-2">
          <SectionCard title="Visão Geral Semanal">
            <div className="flex h-[220px] items-end gap-2">
              {CHART_HEIGHTS.map((height, i) => (
                <div className="flex flex-1 flex-col items-center gap-1.5" key={DAYS[i]}>
                  <div
                    className="w-full rounded-t-md bg-primary/70 transition-all duration-200 hover:bg-primary"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] font-medium text-ink-muted">{DAYS[i]}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-[10px] text-ink-muted">Dados de demonstração</p>
          </SectionCard>
        </div>

        {/* Deby AI */}
        <SectionCard title="Deby AI">
          <div className="flex h-full flex-col justify-between gap-4">
            <div>
              <p className="font-mono text-[48px] font-bold tabular-nums leading-none tracking-tight text-ink">
                {insightsCount}
              </p>
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
