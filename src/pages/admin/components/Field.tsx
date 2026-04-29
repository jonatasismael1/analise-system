import type { ReactNode } from "react";

export function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

export function inputClass() {
  return "mt-1 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";
}
