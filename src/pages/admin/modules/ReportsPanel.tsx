import { SectionCard } from "../../../components/ui/SectionCard";
import { brl } from "../../../lib/formatters";
import type { Appointment, FinanceEntry, Patient, Professional, Service } from "../../../types/clinic";

export function ReportsPanel({ appointments, patients, professionals, services, entries }: { readonly appointments: Appointment[]; readonly patients: Patient[]; readonly professionals: Professional[]; readonly services: Service[]; readonly entries: FinanceEntry[] }) {
  const paid = entries.filter((entry) => entry.tipo !== "despesa" && entry.status === "pago").reduce((sum, entry) => sum + entry.valor, 0);
  const missed = appointments.filter((item) => item.status === "faltou").length;
  const ticket = appointments.length ? paid / appointments.length : 0;
  const metrics = [
    ["Ocupação Média", `${Math.round((appointments.length / Math.max(professionals.length * 40, 1)) * 100)}%`],
    ["Faturamento", brl.format(paid)],
    ["Ticket Médio", brl.format(ticket)],
    ["Taxa de Faltas", `${Math.round((missed / Math.max(appointments.length, 1)) * 100)}%`],
    ["Pacientes Ativos", patients.filter((item) => item.status === "ativo").length],
    ["Serviços Cadastrados", services.length]
  ];
  return (
    <SectionCard title="Relatórios" description="KPIs calculados a partir de agendamentos, pagamentos, pacientes, profissionais e serviços.">
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div className="rounded-xl border border-surface-variant bg-white p-5 transition hover:shadow-clinical" key={label as string}>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">{label}</p>
            <p className="mt-2 text-2xl font-bold text-on-surface">{value}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
