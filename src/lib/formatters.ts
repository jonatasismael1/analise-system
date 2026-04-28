export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function whatsappUrl(phone: string, text: string) {
  const digits = onlyDigits(phone);
  if (!digits) return "";
  return `https://wa.me/55${digits.length <= 11 ? digits : digits.replace(/^55/, "")}?text=${encodeURIComponent(text)}`;
}
