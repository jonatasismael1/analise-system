export function DataMessage({ loading, message, onRetry }: { readonly loading: boolean; readonly message: string | null; readonly onRetry?: () => void }) {
  if (loading) return <div className="rounded border border-outline-variant bg-white px-4 py-3 text-sm text-secondary">Carregando dados...</div>;
  if (message) {
    return (
      <div className="flex flex-col gap-3 rounded border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-primary-dark sm:flex-row sm:items-center sm:justify-between">
        <span>{message}</span>
        {onRetry ? (
          <button className="inline-flex h-8 items-center justify-center rounded border border-primary/30 bg-white px-3 text-xs font-semibold text-primary-dark hover:border-primary" onClick={onRetry} type="button">
            Tentar novamente
          </button>
        ) : null}
      </div>
    );
  }
  return null;
}
