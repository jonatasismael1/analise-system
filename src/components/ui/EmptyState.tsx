export interface EmptyStateProps {
  readonly title: string;
  readonly message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}
