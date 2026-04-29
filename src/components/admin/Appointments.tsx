import type { Appointment as AppointmentItem } from "../../types/clinic";
import { EmptyState } from "../ui/EmptyState";
import { SectionCard } from "../ui/SectionCard";

export interface AppointmentsProps {
  readonly appointments?: AppointmentItem[];
}

export function Appointments({ appointments = [] }: AppointmentsProps) {
  return (
    <SectionCard title="Agendamentos">
      {appointments.length === 0 ? (
        <EmptyState title="Sem agendamentos" message="Novos agendamentos aparecerao nesta lista." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Paciente</th>
                <th>Profissional</th>
                <th>Servico</th>
                <th>Data</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td className="py-3 font-medium text-slate-950">{appointment.pacienteNome}</td>
                  <td>{appointment.profissional}</td>
                  <td>{appointment.servico}</td>
                  <td>{appointment.data} {appointment.horario}</td>
                  <td className="capitalize">{appointment.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
