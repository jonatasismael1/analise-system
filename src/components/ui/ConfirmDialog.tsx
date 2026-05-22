import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export interface ConfirmRequest {

  id: number;
  message: string;
}

function resolveConfirm(id: number, ok: boolean) {
  window.dispatchEvent(new CustomEvent("clinicpro:confirm:resolve:" + id, { detail: ok }));
}

export function ConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    function handle(e: Event) {
      const detail = (e as CustomEvent<ConfirmRequest>).detail;
      setRequest(detail);
    }
    window.addEventListener("clinicpro:confirm", handle);
    return () => window.removeEventListener("clinicpro:confirm", handle);
  }, []);

  if (!request) return null;

  function answer(ok: boolean) {
    if (!request) return;
    resolveConfirm(request.id, ok);
    setRequest(null);
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-[rgba(15,25,24,0.55)] backdrop-blur-sm p-4"
      onClick={() => answer(false)}
    >
      <div
        className="relative w-full max-w-sm rounded-xl border border-danger/20 bg-surface p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Cancelar"
          className="absolute right-4 top-4 rounded p-1 text-ink-muted transition hover:text-ink"
          onClick={() => answer(false)}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-wash">
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-ink">Confirmar ação</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">{request.message}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="h-9 rounded-lg border border-border-strong bg-surface px-4 text-[13px] font-medium text-ink-secondary transition hover:bg-surface-low"
            onClick={() => answer(false)}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="h-9 rounded-lg bg-danger px-4 text-[13px] font-semibold text-white transition hover:bg-danger/90 active:-translate-y-px"
            onClick={() => answer(true)}
            type="button"
          >
            Confirmar exclusão
          </button>
        </div>
      </div>
    </div>
  );
}
