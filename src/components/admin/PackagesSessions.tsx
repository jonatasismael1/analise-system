import type { SessionPackage } from "../../types/clinic";
import { EmptyState } from "../ui/EmptyState";
import { SectionCard } from "../ui/SectionCard";

export interface PackagesSessionsProps {
  readonly packages?: SessionPackage[];
}

export function PackagesSessions({ packages = [] }: PackagesSessionsProps) {
  return (
    <SectionCard title="Pacotes & Sessões">
      {packages.length === 0 ? (
        <EmptyState title="Nenhum pacote" message="Pacotes ativos ficarao listados aqui." />
      ) : (
        <div className="space-y-3">
          {packages.map((sessionPackage) => {
            const percentage = Math.round((sessionPackage.sessoesRealizadas / sessionPackage.totalSessoes) * 100);
            return (
              <article className="rounded-md border border-slate-200 p-4" key={sessionPackage.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{sessionPackage.paciente}</p>
                    <p className="text-sm text-slate-500">{sessionPackage.servico}</p>
                  </div>
                  <p className="text-sm font-medium text-primary-dark">{sessionPackage.sessoesRealizadas}/{sessionPackage.totalSessoes}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
