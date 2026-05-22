import type { ReactNode } from "react";

export function RefinedTable({ headers, children }: { readonly headers: string[]; readonly children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-border">
      <table className="w-full min-w-[760px] border-collapse bg-surface text-left text-[13.5px]">
        <thead className="bg-surface-low">
          <tr>
            {headers.map((header) => (
              <th
                className="px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-muted last:text-right"
                key={header}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-divider">{children}</tbody>
      </table>
    </div>
  );
}
