import { SectionCard } from "../ui/SectionCard";

export interface AIGrowthEngineProps {
  readonly enabled?: boolean;
}

export function AIGrowthEngine({ enabled = true }: AIGrowthEngineProps) {
  return (
    <SectionCard title="AI Growth Engine" description="Insights automaticos serao calculados com dados reais em fase propria.">
      <div className="rounded-md border border-primary/20 bg-primary-soft p-4 text-sm text-primary-dark">
        {enabled ? "Monitorando agenda, retornos, faltas e oportunidades financeiras com mocks temporarios." : "Modulo desativado."}
      </div>
    </SectionCard>
  );
}
