import { onlyDigits } from "./formatters";
import type { FinanceEntry, Patient } from "../types/clinic";

export type ValidationResult = {
  valid: boolean;
  message?: string;
};

function invalid(message: string): ValidationResult {
  return { valid: false, message };
}

function isValidDate(value?: string | null) {
  if (!value) return false;
  return !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

export function validatePatient(patient: Pick<Patient, "nome" | "whatsapp">): ValidationResult {
  if (patient.nome.trim().length < 3) return invalid("Informe um nome com pelo menos 3 caracteres.");
  if (onlyDigits(patient.whatsapp).length < 10) return invalid("Informe um WhatsApp com pelo menos 10 dígitos.");
  return { valid: true };
}

export function validateAppointment(appointment: {
  pacienteNome: string;
  pacienteWhatsapp: string;
  profissionalId: string;
  data: string;
  horario: string;
}): ValidationResult {
  if (!appointment.profissionalId) return invalid("Selecione um profissional.");
  if (appointment.pacienteNome.trim().length < 3) return invalid("Informe o nome do paciente com pelo menos 3 caracteres.");
  // WhatsApp é opcional; se informado, valida o formato
  const digits = onlyDigits(appointment.pacienteWhatsapp);
  if (digits.length > 0 && digits.length < 10) return invalid("WhatsApp informado é inválido. Use pelo menos 10 dígitos ou deixe em branco.");
  if (!isValidDate(appointment.data)) return invalid("Informe uma data válida.");
  if (!appointment.horario) return invalid("Informe um horário válido.");
  return { valid: true };
}

export function validateFinance(entry: Pick<FinanceEntry, "valor"> & { data?: string | null; descricao?: string }): ValidationResult {
  if (entry.descricao !== undefined && entry.descricao.trim().length < 3) return invalid("Informe uma descrição com pelo menos 3 caracteres.");
  if (entry.valor <= 0) return invalid("Informe um valor maior que zero.");
  if (entry.data && !isValidDate(entry.data)) return invalid("Informe uma data válida.");
  return { valid: true };
}
