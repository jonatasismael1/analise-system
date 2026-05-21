import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { assertStaff, getFunctionContext } from "../_shared/auth.ts";
import { evolutionRequest, extractInstanceApiKey, normalizeEvolutionStatus, qrAsDataUrl } from "../_shared/evolution.ts";

interface Payload {
  clinicId: string;
  action: "list" | "create" | "connect" | "connect_or_create" | "status" | "disconnect" | "delete";
  instanceId?: string;
  instanceName?: string;
  webhookUrl?: string;
}

const EVENTS = [
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
  "CONTACTS_UPSERT",
  "CONTACTS_UPDATE",
  "CHATS_UPSERT",
  "CHATS_UPDATE"
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido." }, 405);

  try {
    const payload = await req.json() as Payload;
    if (!payload.clinicId || !payload.action) return json({ error: "Dados obrigatorios invalidos." }, 400);

    const context = await getFunctionContext(req, payload.clinicId);
    assertStaff(context.role);

    if (payload.action === "list") {
      const { data, error } = await context.supabaseAdmin
        .from("whatsapp_instances")
        .select("id, clinic_id, instance_name, status, phone_number, qr_code, created_at, updated_at")
        .eq("clinic_id", payload.clinicId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ ok: true, instances: data ?? [] });
    }

    if (payload.action === "create") {
      const instanceName = sanitizeInstanceName(payload.instanceName);
      if (!instanceName) return json({ error: "Nome da instancia invalido." }, 400);

      const existing = await getInstance(context.supabaseAdmin, payload.clinicId, undefined, instanceName);
      if (existing) return json({ ok: true, instance: sanitizeInstance(existing) });

      const remote = await findRemoteInstance(instanceName).catch(() => null);
      if (remote) {
        const saved = await saveInstance(context.supabaseAdmin, payload.clinicId, instanceName, remote);
        return json({ ok: true, instance: sanitizeInstance(saved) });
      }

      const webhookUrl = buildWebhookUrl(payload.webhookUrl, payload.clinicId);
      const result = await createRemoteInstance(instanceName, webhookUrl).catch(async (error) => {
        const fallback = await findRemoteInstance(instanceName).catch(() => null);
        if (fallback) return fallback;
        throw error;
      });

      const saved = await saveInstance(context.supabaseAdmin, payload.clinicId, instanceName, result);
      return json({ ok: true, instance: sanitizeInstance(saved) });
    }

    if (payload.action === "connect_or_create") {
      const instanceName = sanitizeInstanceName(payload.instanceName);
      let instance = await getInstance(context.supabaseAdmin, payload.clinicId, undefined, instanceName);

      if (!instance) {
        const remote = await findRemoteInstance(instanceName).catch(() => null);
        const webhookUrl = buildWebhookUrl(payload.webhookUrl, payload.clinicId);
        const result = remote ?? await createRemoteInstance(instanceName, webhookUrl);
        instance = await saveInstance(context.supabaseAdmin, payload.clinicId, instanceName, result);
      }

      return await connectInstance(context.supabaseAdmin, instance);
    }

    const instance = await getInstance(context.supabaseAdmin, payload.clinicId, payload.instanceId, payload.instanceName);
    if (!instance) return json({ error: "Instancia nao encontrada." }, 404);

    if (payload.action === "connect") {
      return await connectInstance(context.supabaseAdmin, instance);
    }

    const encoded = encodeURIComponent(instance.instance_name);

    if (payload.action === "status") {
      const instanceKey = extractInstanceApiKey(instance.raw_payload) ?? undefined;
      const result = await evolutionRequest<Record<string, any>>(`/instance/connectionState/${encoded}`, {}, instanceKey);
      const status = normalizeEvolutionStatus(result?.instance?.state ?? result?.instance?.status ?? result?.state);
      await updateInstance(context.supabaseAdmin, instance.id, {
        status,
        qr_code: status === "connected" ? null : instance.qr_code,
        phone_number: instance.phone_number,
        raw_payload: result
      });
      return json({ ok: true, status, instanceName: instance.instance_name });
    }

    if (payload.action === "disconnect") {
      const instanceKey = extractInstanceApiKey(instance.raw_payload) ?? undefined;
      const result = await evolutionRequest<Record<string, any>>(`/instance/logout/${encoded}`, { method: "DELETE" }, instanceKey);
      await updateInstance(context.supabaseAdmin, instance.id, { status: "disconnected", qr_code: null, raw_payload: result });
      return json({ ok: true, status: "disconnected" });
    }

    if (payload.action === "delete") {
      const result = await evolutionRequest<Record<string, any>>(`/instance/delete/${encoded}`, { method: "DELETE" });
      const { error } = await context.supabaseAdmin
        .from("whatsapp_instances")
        .delete()
        .eq("id", instance.id)
        .eq("clinic_id", payload.clinicId);
      if (error) throw error;
      return json({ ok: true, data: result });
    }

    return json({ error: "Acao desconhecida." }, 400);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[evolution-instance] erro interno:", error);
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});

async function createRemoteInstance(instanceName: string, webhookUrl: string) {
  return await evolutionRequest<Record<string, any>>("/instance/create", {
        method: "POST",
        body: JSON.stringify({
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          token: "",
          qrcode: false,
          groupsIgnore: true,
          alwaysOnline: false,
          readMessages: true,
          readStatus: true,
          syncFullHistory: false,
          webhook: webhookUrl ? {
            url: webhookUrl,
            byEvents: false,
            base64: false,
            headers: {
              authorization: Deno.env.get("EVOLUTION_WEBHOOK_SECRET") ?? "",
              "Content-Type": "application/json"
            },
            events: EVENTS
          } : undefined
        })
      });
}

async function findRemoteInstance(instanceName: string) {
  const result = await evolutionRequest<any>(`/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`);
  const items = Array.isArray(result) ? result : result?.response ? [result.response] : [];
  return items.find((item: any) => item?.instance?.instanceName === instanceName || item?.instanceName === instanceName) ?? null;
}

async function saveInstance(supabaseAdmin: any, clinicId: string, instanceName: string, result: Record<string, any>) {
  const instancePayload = result?.instance ?? result;
  const qr = qrAsDataUrl(result?.qrcode?.base64 ?? result?.qrcode ?? result?.base64);
  const remoteStatus = instancePayload?.status ?? instancePayload?.state ?? (qr ? "qr_required" : "starting");
  const phone = String(instancePayload?.owner ?? instancePayload?.number ?? "").replace(/@s\.whatsapp\.net$/i, "").replace(/\D/g, "") || null;
  const { data, error } = await supabaseAdmin
    .from("whatsapp_instances")
    .upsert({
      clinic_id: clinicId,
      instance_name: instanceName,
      status: qr ? "qr_required" : normalizeEvolutionStatus(remoteStatus),
      phone_number: phone,
      qr_code: qr,
      raw_payload: result
    }, { onConflict: "clinic_id,instance_name" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function connectInstance(supabaseAdmin: any, instance: any) {
  const encoded = encodeURIComponent(instance.instance_name);
  const instanceKey = extractInstanceApiKey(instance.raw_payload) ?? undefined;
  const result = await evolutionRequest<Record<string, any>>(`/instance/connect/${encoded}`, {}, instanceKey);
  const qr = qrAsDataUrl(result?.base64 ?? result?.qrcode?.base64 ?? result?.qrcode ?? result?.code ?? result?.pairingCode);
  const status = qr ? "qr_required" : "starting";
  await updateInstance(supabaseAdmin, instance.id, { status, qr_code: qr, raw_payload: mergeEvolutionPayload(instance.raw_payload, result) });
  const { data, error } = await supabaseAdmin.from("whatsapp_instances").select("id, clinic_id, instance_name, status, phone_number, qr_code, created_at, updated_at").eq("id", instance.id).single();
  if (error) throw error;
  return json({ ok: true, status, qr, instance: data });
}

function mergeEvolutionPayload(current: Record<string, any> | null, next: Record<string, any>) {
  return {
    ...(current ?? {}),
    last_response: next,
    hash: current?.hash ?? next?.hash,
    instance: next?.instance ?? current?.instance
  };
}

function sanitizeInstanceName(value?: string) {
  const fallback = Deno.env.get("EVOLUTION_DEFAULT_INSTANCE") ?? "analise-saude";
  return String(value || fallback)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

function buildWebhookUrl(value: string | undefined, clinicId: string) {
  const base = value || Deno.env.get("EVOLUTION_WEBHOOK_URL") || "";
  if (!base) return "";
  const url = new URL(base);
  url.searchParams.set("clinicId", clinicId);
  return url.toString();
}

async function getInstance(supabaseAdmin: any, clinicId: string, instanceId?: string, instanceName?: string) {
  let query = supabaseAdmin.from("whatsapp_instances").select("*").eq("clinic_id", clinicId);
  query = instanceId ? query.eq("id", instanceId) : query.eq("instance_name", instanceName);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

function sanitizeInstance(instance: Record<string, unknown>) {
  return {
    id: instance.id,
    clinic_id: instance.clinic_id,
    instance_name: instance.instance_name,
    status: instance.status,
    phone_number: instance.phone_number,
    qr_code: instance.qr_code,
    created_at: instance.created_at,
    updated_at: instance.updated_at
  };
}

async function updateInstance(supabaseAdmin: any, id: string, values: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from("whatsapp_instances").update(values).eq("id", id);
  if (error) throw error;
}
