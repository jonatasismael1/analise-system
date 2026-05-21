import type { ReactNode } from "react";

const toneClasses = {
  neutral: "border-border-strong bg-surface-low text-ink-secondary",
  success: "border-green-200 bg-success-wash text-success",
  warning: "border-amber-200 bg-warning-wash text-warning",
  danger: "border-danger-border bg-danger-wash text-danger",
  primary: "border-primary/20 bg-primary-wash text-primary-dark",
} as const;

type Tone = keyof typeof toneClasses;

export function StatusBadge({ children, tone = "neutral" }: { readonly children: ReactNode; readonly tone?: Tone }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center rounded-full border px-2 text-[11px] font-semibold leading-none ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
