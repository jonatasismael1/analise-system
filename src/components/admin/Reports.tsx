import { SectionCard } from "../ui/SectionCard";

export interface ReportsProps {
  readonly period?: string;
}

export function Reports({ period = "Mes" }: ReportsProps) {
  return (
    <SectionCard title="Relatórios" description={`Período atual: ${period}. Dados reais serão conectados na fase de relatórios.`}>
      <div className="grid gap-3 sm:grid-cols-3">
        {["Ocupação média", "Ticket médio", "Inadimplência"].map((metric) => (
          <div className="rounded-md border border-slate-200 p-4" key={metric}>
            <p className="text-sm text-slate-500">{metric}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">--</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
