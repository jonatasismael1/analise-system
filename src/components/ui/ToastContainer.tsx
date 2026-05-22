import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import type { ToastEvent, ToastType } from "../../lib/toast";

const DURATION_MS = 4000;

const styles: Record<ToastType, { bar: string; icon: string; bg: string; border: string; text: string }> = {
  success: { bar: "bg-success",  icon: "text-success",  bg: "bg-success-wash",  border: "border-success/20",  text: "text-ink" },
  error:   { bar: "bg-danger",   icon: "text-danger",   bg: "bg-danger-wash",   border: "border-danger/20",   text: "text-ink" },
  warning: { bar: "bg-warning",  icon: "text-warning",  bg: "bg-warning-wash",  border: "border-warning/20",  text: "text-ink" },
  info:    { bar: "bg-primary",  icon: "text-primary",  bg: "bg-primary-wash",  border: "border-primary/20",  text: "text-ink" },
};

const Icons: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

interface ActiveToast extends ToastEvent {
  exiting: boolean;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  useEffect(() => {
    function handleToast(e: Event) {
      const detail = (e as CustomEvent<ToastEvent>).detail;
      setToasts((prev) => [...prev, { ...detail, exiting: false }]);

      setTimeout(() => {
        setToasts((prev) => prev.map((t) => t.id === detail.id ? { ...t, exiting: true } : t));
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== detail.id));
        }, 300);
      }, DURATION_MS);
    }

    window.addEventListener("clinicpro:toast", handleToast);
    return () => window.removeEventListener("clinicpro:toast", handleToast);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  }

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const s = styles[t.type];
        const Icon = Icons[t.type];
        return (
          <div
            key={t.id}
            className={`flex min-w-[280px] max-w-[380px] items-start gap-3 rounded-lg border ${s.border} ${s.bg} px-4 py-3 shadow-toast transition-all duration-300 ${t.exiting ? "translate-x-4 opacity-0" : "translate-x-0 opacity-100"}`}
          >
            <div className={`mt-0.5 shrink-0 ${s.bar} h-full w-[3px] rounded-full`} />
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.icon}`} />
            <p className={`flex-1 text-[13px] font-medium leading-snug ${s.text}`}>{t.message}</p>
            <button
              aria-label="Fechar notificação"
              className="ml-1 shrink-0 rounded p-0.5 text-ink-muted transition hover:text-ink"
              onClick={() => dismiss(t.id)}
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
