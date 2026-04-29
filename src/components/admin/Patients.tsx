import type { Patient } from "../../types/clinic";
import { EmptyState } from "../ui/EmptyState";
import { SectionCard } from "../ui/SectionCard";

export interface PatientsProps {
  readonly patients?: Patient[];
}

export function Patients({ patients = [] }: PatientsProps) {
  return (
    <SectionCard title="Pacientes">
      {patients.length === 0 ? (
        <EmptyState title="Nenhum paciente" message="Pacientes criados pelo agendamento ou admin aparecerao aqui." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {patients.map((patient) => (
            <article className="rounded-md border border-slate-200 p-4" key={patient.id}>
              <p className="font-semibold text-slate-950">{patient.nome}</p>
              <p className="text-sm text-slate-500">{patient.whatsapp}</p>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
