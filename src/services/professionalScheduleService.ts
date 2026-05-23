import { supabase } from "../lib/supabaseClient";

export interface ProfessionalSchedule {
  id: string;
  clinicaId: string;
  professionalId: string;
  dayOfWeek: number; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  frequency: "weekly" | "biweekly" | "monthly";
  referenceDate: string | null; // para quinzenal: data base
  weekOfMonth: number | null;   // para mensal: 1-4 (qual semana)
  startTime: string;
  endTime: string;
  active: boolean;
  notes: string | null;
}

export const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const FREQUENCY_LABELS: Record<ProfessionalSchedule["frequency"], string> = {
  weekly: "Toda semana",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

export const WEEK_OF_MONTH_LABELS: Record<number, string> = {
  1: "1ª semana",
  2: "2ª semana",
  3: "3ª semana",
  4: "4ª semana",
};

function mapRow(row: Record<string, unknown>): ProfessionalSchedule {
  return {
    id: row.id as string,
    clinicaId: row.clinica_id as string,
    professionalId: row.professional_id as string,
    dayOfWeek: row.day_of_week as number,
    frequency: row.frequency as ProfessionalSchedule["frequency"],
    referenceDate: (row.reference_date as string | null) ?? null,
    weekOfMonth: (row.week_of_month as number | null) ?? null,
    startTime: String(row.start_time ?? "08:00").slice(0, 5),
    endTime: String(row.end_time ?? "18:00").slice(0, 5),
    active: row.active as boolean,
    notes: (row.notes as string | null) ?? null,
  };
}

export async function loadProfessionalSchedules(professionalId: string): Promise<ProfessionalSchedule[]> {
  const { data, error } = await supabase
    .from("professional_schedules")
    .select("*")
    .eq("professional_id", professionalId)
    .order("day_of_week")
    .order("start_time");
  if (error) throw error;
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function loadClinicSchedules(clinicId: string): Promise<ProfessionalSchedule[]> {
  const { data, error } = await supabase
    .from("professional_schedules")
    .select("*")
    .eq("clinica_id", clinicId)
    .eq("active", true);
  if (error) throw error;
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function saveSchedule(
  clinicId: string,
  schedule: Omit<ProfessionalSchedule, "id" | "clinicaId"> & { id?: string }
): Promise<void> {
  const payload = {
    clinica_id: clinicId,
    professional_id: schedule.professionalId,
    day_of_week: schedule.dayOfWeek,
    frequency: schedule.frequency,
    reference_date: schedule.referenceDate ?? null,
    week_of_month: schedule.weekOfMonth ?? null,
    start_time: schedule.startTime,
    end_time: schedule.endTime,
    active: schedule.active,
    notes: schedule.notes ?? null,
  };

  if (schedule.id) {
    const { error } = await supabase.from("professional_schedules").update(payload).eq("id", schedule.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("professional_schedules").insert(payload);
    if (error) throw error;
  }
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabase.from("professional_schedules").delete().eq("id", id);
  if (error) throw error;
}

// ── Lógica de disponibilidade ─────────────────────────────────────────────────

function matchesSchedule(dateStr: string, schedule: ProfessionalSchedule): boolean {
  const date = new Date(`${dateStr}T12:00:00`);
  const dayOfWeek = date.getDay();
  if (dayOfWeek !== schedule.dayOfWeek) return false;

  switch (schedule.frequency) {
    case "weekly":
      return true;

    case "biweekly": {
      if (!schedule.referenceDate) return true;
      const ref = new Date(`${schedule.referenceDate}T12:00:00`);
      const diffMs = date.getTime() - ref.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      // Quinzenal: diferença em dias divisível por 14, no mesmo dia da semana
      return diffDays % 14 === 0;
    }

    case "monthly": {
      if (!schedule.weekOfMonth) return true;
      // Semana do mês em que o dia cai (1=primeiros 7 dias, 2=8-14, etc.)
      const weekNum = Math.ceil(date.getDate() / 7);
      return weekNum === schedule.weekOfMonth;
    }
  }
}

/**
 * Verifica disponibilidade do profissional em uma data.
 * Retorna:
 *   true  → data bate com pelo menos um horário cadastrado
 *   false → data não bate com nenhum horário cadastrado
 *   null  → nenhum horário cadastrado (sem restrição)
 */
export function checkAvailability(
  dateStr: string,
  professionalId: string,
  allSchedules: ProfessionalSchedule[]
): true | false | null {
  const schedules = allSchedules.filter(
    (s) => s.professionalId === professionalId && s.active
  );
  if (schedules.length === 0) return null;
  return schedules.some((s) => matchesSchedule(dateStr, s));
}

/** Formata um horário para exibição resumida */
export function formatScheduleSummary(s: ProfessionalSchedule): string {
  const day = DAY_NAMES[s.dayOfWeek] ?? "?";
  const freq = FREQUENCY_LABELS[s.frequency];
  const extra =
    s.frequency === "biweekly" && s.referenceDate
      ? ` (a partir de ${new Date(`${s.referenceDate}T12:00:00`).toLocaleDateString("pt-BR")})`
      : s.frequency === "monthly" && s.weekOfMonth
      ? ` — ${WEEK_OF_MONTH_LABELS[s.weekOfMonth]}`
      : "";
  return `${day} · ${freq}${extra} · ${s.startTime}–${s.endTime}`;
}
