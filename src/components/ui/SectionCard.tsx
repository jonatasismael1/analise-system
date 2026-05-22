import type { ReactNode } from "react";

export interface SectionCardProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly action?: ReactNode;
}

export function SectionCard({ title, description, children, action }: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-border bg-surface shadow-card">
      <div className="flex items-start justify-between gap-4 border-b border-border-divider px-5 py-4 md:px-6">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
          {description ? (
            <p className="max-w-3xl text-xs leading-relaxed text-ink-secondary">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}
