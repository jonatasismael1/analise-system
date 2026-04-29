import type { ReactNode } from "react";

export interface SectionCardProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-clinical ring-1 ring-slate-900/[0.02]">
      <div className="mb-5 flex flex-col gap-1 border-b border-surface-variant/70 pb-4">
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
