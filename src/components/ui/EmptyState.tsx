export interface EmptyStateProps {
  readonly title: string;
  readonly message: string;
  readonly icon?: string;
}

export function EmptyState({ title, message, icon = "inbox" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span
        className="material-symbols-outlined select-none text-ink-muted"
        style={{ fontSize: "40px", fontVariationSettings: '"FILL" 0, "wght" 300' }}
      >
        {icon}
      </span>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <p className="mx-auto max-w-[280px] text-[13px] leading-relaxed text-ink-secondary">{message}</p>
    </div>
  );
}
