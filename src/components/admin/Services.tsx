import { mockServices } from "../../data/mockData";
import { EmptyState } from "../ui/EmptyState";
import { SectionCard } from "../ui/SectionCard";

export interface ServicesProps {
  readonly services?: typeof mockServices;
}

export function Services({ services = mockServices }: ServicesProps) {
  return (
    <SectionCard title="Servicos">
      {services.length === 0 ? (
        <EmptyState title="Nenhum servico" message="Os servicos ativos aparecerao aqui." />
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
