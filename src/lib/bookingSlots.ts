import type { Json } from "../types/database";

interface ScheduleShape {
  dias?: number[];
  inicio?: string;
  fim?: string;
  intervalo_min?: number;
}

function parseSchedule(schedule: Json): ScheduleShape {
  if (schedule && typeof schedule === "object" && !Array.isArray(schedule)) {
    return schedule as ScheduleShape;
  }
  return { dias: [1, 2, 3, 4, 5], inicio: "08:00", fim: "18:00", intervalo_min: 30 };
}

function toMinutes(time: string) {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function toTime(minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

export function buildSlots(schedule: Json, isoDate: string, occupied: string[]) {
  const parsed = parseSchedule(schedule);
  const selectedDate = new Date(`${isoDate}T12:00:00`);
  const day = selectedDate.getDay();
  const allowedDays = parsed.dias ?? [1, 2, 3, 4, 5];

  if (!allowedDays.includes(day)) return [];

  const start = toMinutes(parsed.inicio ?? "08:00");
  const end = toMinutes(parsed.fim ?? "18:00");
  const interval = parsed.intervalo_min ?? 30;
  const occupiedSet = new Set(occupied.map((time) => time.slice(0, 5)));
  const slots: Array<{ time: string; available: boolean }> = [];

  for (let value = start; value < end; value += interval) {
    const time = toTime(value);
    slots.push({ time, available: !occupiedSet.has(time) });
  }

  return slots;
}
