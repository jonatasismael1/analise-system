import type { ConfirmRequest } from "../components/ui/ConfirmDialog";

let nextId = 1;

// Retorna Promise<boolean> — aguarda o usuário responder no modal customizado
export function confirmDangerAction(message: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const id = nextId++;
    const detail: ConfirmRequest = { id, message };

    // O ConfirmDialog escuta este evento e chama resolveConfirm(id, ok) quando o usuário responde
    window.addEventListener(
      "clinicpro:confirm:resolve:" + id,
      (e) => resolve((e as CustomEvent<boolean>).detail),
      { once: true }
    );

    window.dispatchEvent(new CustomEvent("clinicpro:confirm", { detail }));
  });
}
