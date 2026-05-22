import { Percent } from "lucide-react";
import type { PatientProgramMembership, MembershipStatus } from "../../types/clinic";
import type { ProgramaDesconto } from "../../pages/admin/modules/DiscountProgramsPanel";
import type { Patient } from "../../types/clinic";

interface ProgramBadgeProps {
  readonly membership: PatientProgramMembership | null | undefined;
  readonly programas: ProgramaDesconto[];
  readonly patients?: Patient[];
  readonly compact?: boolean;
}

const statusColors: Record<MembershipStatus, string> = {
  active: "bg-emerald-50 border-emerald-200 text-emerald-700",
  inactive: "bg-slate-50 border-slate-200 text-slate-500",
  suspended: "bg-amber-50 border-amber-200 text-amber-700",
};

const statusLabel: Record<MembershipStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  suspended: "Suspenso",
};

export function ProgramBadge({ membership, programas, patients, compact = false }: ProgramBadgeProps) {
  if (!membership) return null;

  const programa = programas.find((p) => p.id === membership.programId);
  if (!programa) return null;

  const holder = membership.holderPatientId && patients
    ? patients.find((p) => p.id === membership.holderPatientId)
    : null;

  const label = membership.role === "holder"
    ? `${programa.nome} · Titular`
    : `${programa.nome} · Dep. ${holder?.nome.split(" ")[0] ?? "Titular"}`;

  const colorClass = statusColors[membership.status];

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}>
        <Percent className="h-2.5 w-2.5" />
        {label}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
      <Percent className="h-3 w-3 shrink-0" />
      <span>{label}</span>
      <span className="opacity-60">· {statusLabel[membership.status]}</span>
    </div>
  );
}
