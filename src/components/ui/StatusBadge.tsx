import type { ReactNode } from "react";

export function StatusBadge({ children, tone = "neutral" }: { readonly children: ReactNode; readonly tone?: "neutral" | "success" | "warning" | "danger" }) {
  const toneClass = {
    neutral: "border-surface-variant bg-surface-container-low text-secondary",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-red-200 bg-red-50 text-error"
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}
