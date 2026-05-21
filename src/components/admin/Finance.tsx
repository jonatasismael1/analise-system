import type { FinanceEntry } from "../../types/clinic";
import { EmptyState } from "../ui/EmptyState";
import { SectionCard } from "../ui/SectionCard";

export interface FinanceProps {
  readonly entries?: FinanceEntry[];
}

export function Finance({ entries = [] }: FinanceProps) {
  return (
    <SectionCard title="Financeiro">
      {entries.length === 0 ? (
        <EmptyState title="Sem registros financeiros" message="Pagamentos e despesas serão conectados em fase própria." />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div className="flex items-center justify-between rounded-md border border-slate-200 p-3" key={entry.id}>
              <div>
                <p className="font-medium text-slate-950">{entry.descricao}</p>
                <p className="text-sm capitalize text-slate-500">{entry.status}</p>
              </div>
              <p className="font-semibold text-slate-950">{entry.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
