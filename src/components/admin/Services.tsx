import type { Service } from "../../types/clinic";
import { EmptyState } from "../ui/EmptyState";
import { SectionCard } from "../ui/SectionCard";

export interface ServicesProps {
  readonly services?: Service[];
}

export function Services({ services = [] }: ServicesProps) {
  return (
    <SectionCard title="Serviços">
      {services.length === 0 ? (
        <EmptyState title="Nenhum serviço" message="Os serviços ativos aparecerão aqui." />
      ) : (
        <div className="divide-y divide-slate-200">
          {services.map((service) => (
            <div className="flex items-center justify-between gap-4 py-3" key={service.id}>
              <div>
                <p className="font-medium text-slate-950">{service.nome}</p>
                <p className="text-sm text-slate-500">{service.duracaoMin} min</p>
              </div>
              <p className="font-semibold text-primary-dark">{service.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
