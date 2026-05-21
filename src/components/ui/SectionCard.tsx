import type { ReactNode } from "react";

export interface SectionCardProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-lg border border-[rgba(21,168,152,0.12)] bg-surface shadow-card">
      <div className="flex flex-col gap-1 border-b border-border-divider px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="max-w-3xl text-[13px] leading-relaxed text-ink-secondary">{description}</p>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
