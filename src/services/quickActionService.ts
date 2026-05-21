import { supabase } from "../lib/supabaseClient";

export const DEFAULT_INSTANCE_NAME = "analise-saude";

export type EvolutionState = "open" | "close" | "connecting" | "refused" | "unknown";

export interface EvolutionInstance {
  instanceName: string;
  state: EvolutionState;
  profileName: string | null;
  profilePicUrl: string | null;
  phoneNumber: string | null;
}

export interface QrCodeResult {
  code: string | null;
  base64: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// A Edge Function quick-action SEMPRE retorna:
//   { ok: boolean, status: number, url: string, data: <resposta da Evolution API> }
//
// callQuickAction verifica ok e devolve apenas data.data (a resposta real).
// ─────────────────────────────────────────────────────────────────────────────

async function callQuickAction<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const { data: envelope, error } = await supabase.functions.invoke("quick-action", { body });

  // Erro de rede ou Supabase
  if (error) {
    const ctx = (error as { context?: Response })?.context;
    if (ctx) {
      try {
        const payload = await ctx.clone().json();
        throw new Error(String(payload?.error ?? payload?.message ?? "Erro"));
      } catch (parseErr) {
        if (parseErr instanceof Error) throw parseErr;
      }
    }
    throw new Error((error as Error)?.message ?? "Erro ao comunicar com o servidor.");
  }

  // A Edge Function retornou ok: false — Evolution API retornou erro
  if (!envelope?.ok) {
    const inner = envelope?.data as Record<string, unknown> | undefined;
    const msg = inner?.error ?? inner?.message ?? envelope?.error ?? "Erro na operação.";
    throw new Error(String(msg));
  }

  // Retorna apenas o corpo real da Evolution API (envelope.data)
  return envelope.data as T;
}

// ─── Ações ───────────────────────────────────────────────────────────────────

export async function fetchInstances(): Promise<EvolutionInstance[]> {
  // Evolution API retorna array direto: [{ instance: {...}, state: "open" }, ...]
  const data = await callQuickAction<unknown>({ action: "fetch_instances" });
  const arr = Array.isArray(data) ? data : [];
  return arr.map(mapInstance).filter((i): i is EvolutionInstance => i !== null && Boolean(i.instanceName));
}

export async function createInstance(instanceName: string): Promise<EvolutionInstance> {
  // Evolution API retorna: { instance: { instanceName, status }, settings, ... }
  const data = await callQuickAction<Record<string, unknown>>({ action: "create_instance", instanceName });
  return mapInstance(data) ?? { instanceName, state: "close", profileName: null, profilePicUrl: null, phoneNumber: null };
}

export async function connectInstance(instanceName: string): Promise<QrCodeResult> {
  // Evolution API retorna: { base64: "data:image/png;base64,...", code: "2@..." }
  const data = await callQuickAction<Record<string, unknown>>({ action: "connect_instance", instanceName });
  return {
    code: String(data?.code ?? data?.qrcode ?? data?.qr ?? "") || null,
    base64: String(data?.base64 ?? "") || null
  };
}

export async function getInstanceStatus(instanceName: string): Promise<EvolutionState> {
  // Evolution API retorna: { instance: { instanceName, state: "open"|"close"|... } }
  const data = await callQuickAction<Record<string, unknown>>({ action: "get_status", instanceName });
  const inst = (data?.instance as Record<string, unknown>) ?? data;
  const raw = String(inst?.state ?? inst?.connectionStatus ?? inst?.status ?? "unknown");
  return normalizeState(raw);
}

export async function logoutInstance(instanceName: string): Promise<void> {
  await callQuickAction({ action: "logout_instance", instanceName });
}

export async function deleteInstance(instanceName: string): Promise<void> {
  await callQuickAction({ action: "delete_instance", instanceName });
}

export async function setInstanceWebhook(instanceName: string, clinicId: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook?clinicId=${clinicId}`;
  await callQuickAction({ action: "set_webhook", instanceName, webhookUrl });
}

export async function sendWhatsAppText(instanceName: string, phone: string, text: string): Promise<void> {
  await callQuickAction({ action: "send_text", instanceName, number: phone, text });
}

export async function sendWhatsAppMedia(input: {
  instanceName: string;
  phone: string;
  mediaUrl: string;
  mediaType: "image" | "video" | "audio" | "document";
  caption?: string;
  fileName?: string;
  mimeType?: string;
}): Promise<void> {
  await callQuickAction({
    action: "send_media",
    instanceName: input.instanceName,
    number: input.phone,
    mediaUrl: input.mediaUrl,
    mediaType: input.mediaType,
    caption: input.caption ?? "",
    fileName: input.fileName ?? "",
    mimeType: input.mimeType ?? "application/octet-stream",
  });
}

export async function fetchContactProfilePicture(
  instanceName: string,
  phone: string
): Promise<string | null> {
  try {
    const data = await callQuickAction<Record<string, unknown>>({
      action: "fetch_profile_picture",
      instanceName,
      number: phone,
    });
    // Evolution retorna { profilePictureUrl: "https://..." } ou null
    const url = (data?.profilePictureUrl ?? data?.image ?? data?.url ?? null) as string | null;
    return url || null;
  } catch {
    // Foto não disponível não é erro crítico
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeState(raw: string): EvolutionState {
  const s = raw.toLowerCase().trim();
  if (s === "open") return "open";
  if (s === "connecting") return "connecting";
  if (s === "refused") return "refused";
  if (s === "close" || s === "closed") return "close";
  return "unknown";
}

function mapInstance(item: unknown): EvolutionInstance | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;

  // Instância pode estar em raw.instance ou no próprio raw
  const inst: Record<string, unknown> =
    raw.instance && typeof raw.instance === "object"
      ? (raw.instance as Record<string, unknown>)
      : raw;

  const instanceName = String(inst.instanceName ?? inst.name ?? raw.instanceName ?? "").trim();
  if (!instanceName) return null;

  const stateRaw = String(
    raw.connectionStatus ?? raw.state ??
    inst.connectionStatus ?? inst.state ?? inst.status ??
    "unknown"
  );

  return {
    instanceName,
    state: normalizeState(stateRaw),
    profileName: (inst.profileName ?? inst.pushName ?? null) as string | null,
    profilePicUrl: (inst.profilePicUrl ?? null) as string | null,
    phoneNumber: (inst.owner ?? inst.phone ?? inst.number ?? null) as string | null
  };
}
