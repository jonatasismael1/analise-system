// Sistema de toast global via CustomEvent — funciona em hooks e serviços sem precisar de contexto React
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastEvent {
  id: number;
  message: string;
  type: ToastType;
}

let nextId = 1;

function emit(message: string, type: ToastType) {
  const event: ToastEvent = { id: nextId++, message, type };
  window.dispatchEvent(new CustomEvent("clinicpro:toast", { detail: event }));
}

export const toast = {
  success: (message: string) => emit(message, "success"),
  error:   (message: string) => emit(message, "error"),
  warning: (message: string) => emit(message, "warning"),
  info:    (message: string) => emit(message, "info"),
};
