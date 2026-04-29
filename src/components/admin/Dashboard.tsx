import { SectionCard } from "../ui/SectionCard";

export interface DashboardProps {
  readonly compact?: boolean;
  readonly professionalsCount?: number;
  readonly appointmentsCount?: number;
  readonly patientsCount?: number;
  readonly paidRevenue?: number;
}

export function Dashboard({ compact = false, professionalsCount = 0, appointmentsCount = 0, patientsCount = 0, paidRevenue = 0 }: DashboardProps) {
  return (
    <SectionCard title="Dashboard" description="Resumo operacional com dados reais da clínica.">
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
        {[
          ["Profissionais ativos", professionalsCount],
          ["Agendamentos hoje", appointmentsCount],
          ["Pacientes", patientsCount],
          ["Receita paga", paidRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })]
        ].map(([label, value]) => (
          <div className="rounded-md border border-slate-200 p-4" key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
