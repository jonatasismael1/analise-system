import type { ReactNode } from "react";

export function RefinedTable({ headers, children }: { readonly headers: string[]; readonly children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[rgba(21,168,152,0.12)]">
      <table className="w-full min-w-[760px] border-collapse bg-surface text-left text-[13.5px]">
        <thead className="bg-surface-low">
          <tr>
            {headers.map((header) => (
              <th
                className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary last:text-right"
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
