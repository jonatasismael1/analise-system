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

export function StatusPill({ value }: { readonly value: string }) {
  const tone =
    value === "pago" || value === "confirmado" || value === "ativo"
      ? "bg-teal-50 text-primary border border-teal-200"
      : value === "atrasado" || value === "faltou" || value === "cancelado"
      ? "bg-red-50 text-error border border-red-200"
      : value === "pendente"
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : value === "concluido"
      ? "bg-blue-50 text-blue-700 border border-blue-200"
      : "bg-slate-100 text-secondary border border-slate-200";
  const label = STATUS_LABELS[value] ?? value.replace(/_/g, " ");
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>;
}
