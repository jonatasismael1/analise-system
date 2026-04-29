import type { ReactNode } from "react";

export function RefinedTable({ headers, children }: { readonly headers: string[]; readonly children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full min-w-[760px] border-collapse bg-white text-left text-sm">
        <thead className="bg-surface-container-low">
          <tr>{headers.map((header) => <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant last:text-right" key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
