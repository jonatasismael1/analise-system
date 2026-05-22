import type { ReactNode } from "react";

const toneClasses = {
  neutral: "border-border-strong bg-surface-low text-ink-secondary",
  success: "border-green-100 bg-green-50 text-green-700",
  warning: "border-yellow-100 bg-yellow-50 text-yellow-700",
  danger: "border-red-100 bg-red-50 text-red-700",
  primary: "border-blue-100 bg-blue-50 text-blue-700",
} as const;

type Tone = keyof typeof toneClasses;

export function StatusBadge({ children, tone = "neutral" }: { readonly children: ReactNode; readonly tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
