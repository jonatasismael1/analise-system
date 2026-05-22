/* global Response, fetch, console */
import { createClient } from "@supabase/supabase-js";

const LOOKAHEAD_START_MINUTES = 23.5 * 60;
const LOOKAHEAD_END_MINUTES = 24.5 * 60;
const MAX_ATTEMPTS = 3;

export default async function handler() {
  try {
    const supabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const now = new Date();
    const windowStart = new Date(now.getTime() + LOOKAHEAD_START_MINUTES * 60_000);
    const windowEnd = new Date(now.getTime() + LOOKAHEAD_END_MINUTES * 60_000);
    const appointments = await loadCandidateAppointments(supabase, windowStart, windowEnd);
    const instances = await loadConnectedInstances(supabase, [...new Set(appointments.map((item) => item.clinica_id))]);

    const results = { scanned: appointments.length, sent: 0, skipped: 0, failed: 0 };

    for (const appointment of appointments) {
      const instance = instances.get(appointment.clinica_id);
      if (!instance) {
        await markIgnored(supabase, appointment.id, "Nenhuma instancia WhatsApp conectada.");
        results.skipped += 1;
        continue;
      }

      const phone = normalizePhone(appointment.paciente_whatsapp);
      if (!phone) {
        await markIgnored(supabase, appointment.id, "Paciente sem WhatsApp valido.");
        results.skipped += 1;
        continue;
      }

      const claimed = await claimAppointment(supabase, appointment);
      if (!claimed) {
        results.skipped += 1;
        continue;
      }

      try {
        const message = buildReminderMessage(appointment);
        const result = await evolutionRequest(
          `/message/sendText/${encodeURIComponent(instance.instance_name)}`,
          {
            method: "POST",
            body: JSON.stringify({
              number: phone,
              text: message,
              delay: 800,
              linkPreview: false
            })
          },
          extractInstanceApiKey(instance.raw_payload)
        );

        await persistOutgoingMessage(supabase, appointment, instance, phone, message, result);
        await markSent(supabase, appointment.id);
        results.sent += 1;
      } catch (error) {
        await markFailed(supabase, appointment.id, error);
        results.failed += 1;
      }
    }

    return json({ ok: true, ...results });
  } catch (error) {
    console.error("[appointment-reminders] erro interno:", error);
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
}

export const config = {
  schedule: "*/15 * * * *"
};

async function loadCandidateAppointments(supabase, windowStart, windowEnd) {
  const { data, error } = await supabase
    .from("agendamentos")
    .select("id, clinica_id, profissional_id, servico_id, paciente_nome, paciente_whatsapp, data, horario, lembrete_whatsapp_tentativas, clinicas(nome), profissionais(nome), servicos(nome)")
    .in("status", ["pendente", "confirmado"])
    .is("lembrete_whatsapp_enviado_em", null)
    .gte("data", toISODate(windowStart))
    .lte("data", toISODate(windowEnd))
    .lt("lembrete_whatsapp_tentativas", MAX_ATTEMPTS)
    .limit(100);
  if (error) throw error;

  return (data ?? []).filter((item) => {
    const scheduled = appointmentDate(item);
    return scheduled >= windowStart && scheduled <= windowEnd;
  });
}

async function loadConnectedInstances(supabase, clinicIds) {
  const map = new Map();
  if (clinicIds.length === 0) return map;

  const { data, error } = await supabase
    .from("whatsapp_instances")
    .select("id, clinic_id, instance_name, raw_payload")
    .in("clinic_id", clinicIds)
    .eq("status", "connected")
    .order("updated_at", { ascending: false });
  if (error) throw error;

  for (const instance of data ?? []) {
    if (!map.has(instance.clinic_id)) map.set(instance.clinic_id, instance);
  }
  return map;
}

async function claimAppointment(supabase, appointment) {
  const { data, error } = await supabase
    .from("agendamentos")
    .update({
      lembrete_whatsapp_status: "processando",
      lembrete_whatsapp_erro: null,
      lembrete_whatsapp_tentativas: (appointment.lembrete_whatsapp_tentativas ?? 0) + 1
    })
    .eq("id", appointment.id)
    .is("lembrete_whatsapp_enviado_em", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
}

async function markSent(supabase, appointmentId) {
  const { error } = await supabase
    .from("agendamentos")
    .update({
      lembrete_whatsapp_status: "enviado",
      lembrete_whatsapp_enviado_em: new Date().toISOString(),
      lembrete_whatsapp_erro: null
    })
    .eq("id", appointmentId);
  if (error) throw error;
}

async function markIgnored(supabase, appointmentId, reason) {
  const { error } = await supabase
    .from("agendamentos")
    .update({
      lembrete_whatsapp_status: "ignorado",
      lembrete_whatsapp_erro: reason
    })
    .eq("id", appointmentId)
    .is("lembrete_whatsapp_enviado_em", null);
  if (error) throw error;
}

async function markFailed(supabase, appointmentId, error) {
  const { error: updateError } = await supabase
    .from("agendamentos")
    .update({
      lembrete_whatsapp_status: "erro",
      lembrete_whatsapp_erro: error instanceof Error ? error.message.slice(0, 500) : "Erro desconhecido."
    })
    .eq("id", appointmentId);
  if (updateError) throw updateError;
}

async function persistOutgoingMessage(supabase, appointment, instance, phone, message, result) {
  const now = new Date().toISOString();
  const { data: contact, error: contactError } = await supabase
    .from("whatsapp_contacts")
    .upsert({
      clinic_id: appointment.clinica_id,
      instance_id: instance.id,
      name: appointment.paciente_nome,
      phone
    }, { onConflict: "clinic_id,instance_id,phone" })
    .select("id")
    .single();
  if (contactError) throw contactError;

  const { data: conversation, error: conversationError } = await supabase
    .from("whatsapp_conversations")
    .upsert({
      clinic_id: appointment.clinica_id,
      instance_id: instance.id,
      contact_id: contact.id,
      status: "pending",
      last_message: message,
      last_message_at: now
    }, { onConflict: "clinic_id,instance_id,contact_id" })
    .select("id")
    .single();
  if (conversationError) throw conversationError;

  const { error: messageError } = await supabase
    .from("whatsapp_messages")
    .insert({
      clinic_id: appointment.clinica_id,
      instance_id: instance.id,
      conversation_id: conversation.id,
      evolution_message_id: getMessageId(result),
      direction: "out",
      message_type: "text",
      content: message,
      raw_payload: result,
      status: result?.status ?? "sent",
      sent_at: now
    });
  if (messageError) throw messageError;
}

function buildReminderMessage(appointment) {
  const clinicName = appointment.clinicas?.nome || "Analise Saude";
  const professionalName = appointment.profissionais?.nome || "seu profissional";
  const serviceName = appointment.servicos?.nome ? ` (${appointment.servicos.nome})` : "";
  return [
    `Ola, ${firstName(appointment.paciente_nome)}!`,
    `Lembrete do seu atendimento na ${clinicName}: ${dateLabel(appointment.data)} as ${appointment.horario.slice(0, 5)} com ${professionalName}${serviceName}.`,
    "Se precisar remarcar, responda esta mensagem."
  ].join("\n\n");
}

async function evolutionRequest(path, init = {}, instanceApiKey) {
  const response = await fetch(`${getEnv("EVOLUTION_API_URL").replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      apikey: instanceApiKey || getEnv("EVOLUTION_API_KEY"),
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {})
    }
  });
  const text = await response.text();
  const data = text ? safeJson(text) : null;
  if (!response.ok) throw new Error(`Evolution API ${response.status}: ${extractEvolutionError(data)}`);
  return data;
}

function getEnv(name) {
  const value = globalThis.Netlify?.env?.get(name) || globalThis.process?.env?.[name];
  if (!value) throw new Error(`${name} ausente.`);
  return value;
}

function normalizePhone(value) {
  const digits = String(value ?? "").replace(/@s\.whatsapp\.net$/i, "").replace(/@c\.us$/i, "").replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function extractInstanceApiKey(value) {
  const key = value?.hash?.apikey ?? value?.apikey ?? value?.instance?.apikey ?? value?.instance?.token ?? value?.token;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}

function getMessageId(message) {
  return String(message?.key?.id ?? message?.id ?? message?.messageId ?? "") || null;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function extractEvolutionError(data) {
  const value = data?.message ?? data?.error ?? data?.response?.message ?? data?.response?.error ?? data?.raw ?? "falha na requisicao.";
  return Array.isArray(value) ? value.join("; ") : String(value).slice(0, 300);
}

function appointmentDate(appointment) {
  return new Date(`${appointment.data}T${appointment.horario.slice(0, 8)}`);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateLabel(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function firstName(name) {
  return name.trim().split(/\s+/)[0] || "tudo bem";
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
