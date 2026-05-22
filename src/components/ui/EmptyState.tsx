import type { ComponentType } from "react";

export interface EmptyStateProps {
  readonly title: string;
  readonly message: string;
  readonly icon?: string;
  readonly LucideIcon?: ComponentType<{ className?: string; size?: number }>;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}

export function EmptyState({ title, message, icon = "inbox", LucideIcon, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {LucideIcon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-low">
          <LucideIcon className="text-ink-muted" size={28} />
        </div>
      ) : (
        <span
          className="material-symbols-outlined select-none text-ink-muted"
          style={{ fontSize: "40px", fontVariationSettings: '"FILL" 0, "wght" 300' }}
        >
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        <p className="mx-auto max-w-[280px] text-[13px] leading-relaxed text-ink-secondary">{message}</p>
      </div>
      {actionLabel && onAction && (
        <button
          className="mt-2 inline-flex h-9 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark active:-translate-y-px"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
