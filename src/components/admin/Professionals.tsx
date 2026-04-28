import { mockProfessionals } from "../../data/mockData";
import { EmptyState } from "../ui/EmptyState";
import { SectionCard } from "../ui/SectionCard";

export interface ProfessionalsProps {
  readonly professionals?: typeof mockProfessionals;
}

export function Professionals({ professionals = mockProfessionals }: ProfessionalsProps) {
  return (
    <SectionCard title="Profissionais" description="Mock atual: sera substituido por CRUD Supabase na fase 5.">
      {professionals.length === 0 ? (
        <EmptyState title="Nenhum profissional" message="Cadastre profissionais quando o CRUD estiver conectado." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {professionals.map((professional) => (
            <article className="rounded-md border border-slate-200 p-4" key={professional.id}>
              <p className="font-semibold text-slate-950">{professional.nome}</p>
              <p className="text-sm text-slate-500">{professional.especialidade}</p>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
