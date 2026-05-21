const STATUS_LABELS: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
  confirmado: "Confirmado",
  concluido: "Concluído",
  faltou: "Faltou",
  ativo: "Ativo",
  inativo: "Inativo",
  retorno_pendente: "Retorno pendente",
  ociosidade: "Ociosidade",
  retorno: "Retorno",
  falta: "Falta",
  financeiro: "Financeiro",
};

const STATUS_TONE: Record<string, string> = {
  pago:     "bg-success-wash text-success border border-green-200",
  ativo:    "bg-primary-wash text-primary-dark border border-primary/20",
  confirmado: "bg-primary-wash text-primary-dark border border-primary/20",
  concluido: "bg-success-wash text-success border border-green-200",
  retorno:  "bg-primary-wash text-primary-dark border border-primary/20",
  pendente: "bg-warning-wash text-warning border border-amber-200",
  retorno_pendente: "bg-warning-wash text-warning border border-amber-200",
  ociosidade: "bg-warning-wash text-warning border border-amber-200",
  atrasado: "bg-danger-wash text-danger border border-danger-border",
  cancelado: "bg-danger-wash text-danger border border-danger-border",
  faltou:   "bg-danger-wash text-danger border border-danger-border",
  falta:    "bg-danger-wash text-danger border border-danger-border",
  inativo:  "bg-surface-low text-ink-muted border border-border-strong",
  financeiro: "bg-surface-low text-ink-secondary border border-border-strong",
};

export function StatusPill({ value }: { readonly value: string }) {
  const tone = STATUS_TONE[value] ?? "bg-surface-low text-ink-secondary border border-border-strong";
  const label = STATUS_LABELS[value] ?? value.replace(/_/g, " ");

  return (
    <span className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-semibold leading-none ${tone}`}>
      {label}
    </span>
  );
}
