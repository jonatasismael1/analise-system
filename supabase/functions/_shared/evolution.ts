import { env } from "./auth.ts";

export type EvolutionStatus = "connected" | "disconnected" | "qr_required" | "starting" | "error";

export function evolutionBaseUrl() {
  return env("EVOLUTION_API_URL").replace(/\/$/, "");
}

export async function evolutionRequest<T = unknown>(
  path: string,
  init: RequestInit = {},
  apiKey = env("EVOLUTION_API_KEY")
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  let response: Response;
  try {
    response = await fetch(`${evolutionBaseUrl()}${path}`, {
      ...init,
      signal: init.signal ?? controller.signal,
      headers: {
        apikey: apiKey,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {})
      }
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error("Evolution API demorou para responder. Verifique se o servico Evolution esta saudavel e se consegue criar instancias pelo Manager.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    console.error("[evolution] request failed", response.status, path, data);
    throw new Error(`Evolution API ${response.status}: ${extractEvolutionError(data)}`);
  }

  return data as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function extractEvolutionError(data: unknown) {
  if (!data || typeof data !== "object") return "falha na requisicao.";
  const payload = data as Record<string, any>;
  const value =
    payload.message ??
    payload.error ??
    payload.response?.message ??
    payload.response?.error ??
    payload.raw ??
    "falha na requisicao.";
  return Array.isArray(value) ? value.join("; ") : String(value).slice(0, 300);
}

export function extractInstanceApiKey(value: unknown) {
  const payload = value as Record<string, any> | null;
  const key =
    payload?.hash?.apikey ??
    payload?.apikey ??
    payload?.instance?.apikey ??
    payload?.instance?.token ??
    payload?.token;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}

export function normalizeEvolutionStatus(value: unknown): EvolutionStatus {
  const status = String(value ?? "").toLowerCase();
  if (["open", "connected", "online"].includes(status)) return "connected";
  if (["connecting", "created", "loading", "starting"].includes(status)) return "starting";
  if (["qr", "qrcode", "qr_required", "scan_qr_code"].includes(status)) return "qr_required";
  if (["close", "closed", "disconnected", "offline", "logout"].includes(status)) return "disconnected";
  if (["error", "failed"].includes(status)) return "error";
  return "disconnected";
}

export function cleanPhone(value: unknown) {
  return String(value ?? "")
    .replace(/@s\.whatsapp\.net$/i, "")
    .replace(/@c\.us$/i, "")
    .replace(/\D/g, "");
}

export function getMessageText(message: Record<string, unknown>) {
  const content = message.message as Record<string, any> | undefined;
  return String(
    content?.conversation ??
      content?.extendedTextMessage?.text ??
      content?.imageMessage?.caption ??
      content?.videoMessage?.caption ??
      content?.documentMessage?.caption ??
      message.body ??
      message.text ??
      ""
  );
}

export function getMessageType(message: Record<string, unknown>) {
  const content = message.message as Record<string, unknown> | undefined;
  if (!content) return "text";
  if ("imageMessage" in content) return "image";
  if ("videoMessage" in content) return "video";
  if ("audioMessage" in content) return "audio";
  if ("documentMessage" in content) return "document";
  if ("conversation" in content || "extendedTextMessage" in content) return "text";
  return "unknown";
}

export function getMessageMediaUrl(message: Record<string, unknown>) {
  const content = message.message as Record<string, any> | undefined;
  return String(
    content?.imageMessage?.url ??
      content?.videoMessage?.url ??
      content?.audioMessage?.url ??
      content?.documentMessage?.url ??
      message.mediaUrl ??
      ""
  ) || null;
}

export function getMessageId(message: Record<string, any>) {
  return String(message?.key?.id ?? message?.id ?? message?.messageId ?? "") || null;
}

export function getRemoteJid(message: Record<string, any>) {
  return String(message?.key?.remoteJid ?? message?.remoteJid ?? message?.from ?? message?.chatId ?? "");
}

export function messageSentAt(message: Record<string, any>) {
  const timestamp = message?.messageTimestamp ?? message?.timestamp;
  if (!timestamp) return new Date().toISOString();
  const numeric = Number(timestamp);
  if (!Number.isFinite(numeric)) return new Date().toISOString();
  return new Date(numeric > 9999999999 ? numeric : numeric * 1000).toISOString();
}

export function qrAsDataUrl(value: unknown) {
  const raw = String(value ?? "");
  if (!raw) return null;
  if (raw.startsWith("data:image")) return raw;
  if (raw.startsWith("http")) return raw;
  if (raw.includes("@") || raw.includes(",") || raw.length < 120) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(raw)}`;
  }
  return `data:image/png;base64,${raw}`;
}
