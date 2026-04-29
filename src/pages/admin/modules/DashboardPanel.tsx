import { SectionCard } from "../../../components/ui/SectionCard";
import { brl } from "../../../lib/formatters";
import type { Appointment, Patient, Professional } from "../../../types/clinic";
import { StatusPill } from "../components/StatusPill";

export function DashboardPanel({ appointments, professionals, patients, kpis, insightsCount }: { readonly appointments: Appointment[]; readonly professionals: Professional[]; readonly patients: Patient[]; readonly kpis: { revenue: number; forecast: number; overdue: number; profit: number }; readonly insightsCount: number }) {
  const cards = [
    { label: "Total de Consultas", value: appointments.length.toString(), detail: "Todos os períodos", color: "text-primary" },
    { label: "Ocupação Média", value: `${Math.min(100, Math.round((appointments.filter((item) => item.status === "confirmado").length / Math.max(professionals.length * 40, 1)) * 100))}%`, detail: "agenda semanal", color: "text-blue-600" },
    { label: "Profissionais Ativos", value: professionals.filter((item) => item.ativo).length.toString(), detail: "em operação", color: "text-teal-600" },
    { label: "Receita Prevista", value: brl.format(kpis.forecast), detail: `${brl.format(kpis.overdue)} em atraso`, color: kpis.overdue > 0 ? "text-error" : "text-primary" },
  ];
  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, color }) => (
          <div className="group rounded-xl border border-surface-variant bg-white p-5 transition hover:border-primary/20 hover:shadow-clinical" key={label}>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">{label}</p>
            <p className={`mt-2 text-3xl font-bold tracking-tight text-on-surface`}>{value}</p>
            <p className={`mt-1.5 text-xs font-medium ${color}`}>{detail}</p>
          </div>
        ))}
      </section>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="Visão Geral Semanal">
          <div className="flex h-[240px] items-end gap-2 px-1">
            {[42, 66, 84, 55, 72, 31, 48].map((height, index) => (
              <div className="flex flex-1 flex-col items-center gap-1.5" key={index}>
                <div className="w-full rounded-t-md bg-primary/80 transition hover:bg-primary" style={{ height: `${height}%` }} />
                <span className="text-[10px] font-medium text-secondary">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][index]}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] text-secondary">Dados de demonstração</p>
        </SectionCard>
        <SectionCard title="AI Growth Engine">
          <div className="space-y-3">
            <p className="text-4xl font-bold tracking-tight text-on-surface">{insightsCount}</p>
            <p className="text-sm text-secondary">Oportunidades detectadas entre agenda, pacientes e financeiro.</p>
            <StatusPill value={patients.filter((item) => item.status !== "ativo").length ? "retorno_pendente" : "ativo"} />
          </div>
        </SectionCard>
      </div>
    </>
  );
}
