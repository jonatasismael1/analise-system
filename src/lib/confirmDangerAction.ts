export function confirmDangerAction(message: string) {
  if (typeof window === "undefined") return false;
  return window.confirm(message);
}
