import { mockAppointments, mockFinanceEntries, mockPatients, mockProfessionals } from "../../data/mockData";
import { SectionCard } from "../ui/SectionCard";

export interface DashboardProps {
  readonly compact?: boolean;
}

export function Dashboard({ compact = false }: DashboardProps) {
  const paidRevenue = mockFinanceEntries.filter((entry) => entry.status === "pago").reduce((sum, entry) => sum + entry.valor, 0);

  return (
    <SectionCard title="Dashboard" description="Resumo operacional com dados mockados temporarios.">
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
        {[
          ["Profissionais ativos", mockProfessionals.length],
          ["Agendamentos hoje", mockAppointments.length],
          ["Pacientes", mockPatients.length],
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
