import { supabase } from "../lib/supabaseClient";
import { todayISO } from "../lib/formatters";
import type { FinanceEntry } from "../types/clinic";

export type PaymentInput = {
  valor: number;
  status: FinanceEntry["status"];
  formaPagamento?: string | null;
  pacienteId?: string | null;
  servicoId?: string | null;
  profissionalId?: string | null;
  descricao?: string;
  data?: string | null;
};

export type ExpenseInput = {
  descricao: string;
  categoria?: string | null;
  valor: number;
  status: FinanceEntry["status"];
  data?: string | null;
};

export function createPaymentRecord(clinicId: string, values: PaymentInput) {
  return supabase.from("pagamentos").insert({
    clinica_id: clinicId,
    valor: values.valor,
    status: values.status,
    forma_pagamento: values.formaPagamento ?? "manual",
    paciente_id: values.pacienteId ?? null,
    servico_id: values.servicoId ?? null,
    profissional_id: values.profissionalId ?? null,
    data_vencimento: values.data ?? todayISO(),
    descricao: values.descricao ?? null
  });
}

export function updatePaymentRecord(id: string, values: PaymentInput) {
  return supabase.from("pagamentos").update({
    valor: values.valor,
    status: values.status,
    forma_pagamento: values.formaPagamento ?? null,
    paciente_id: values.pacienteId ?? null,
    servico_id: values.servicoId ?? null,
    profissional_id: values.profissionalId ?? null,
    data_vencimento: values.data ?? null,
    descricao: values.descricao ?? null
  }).eq("id", id);
}

export function deletePaymentRecord(id: string) {
  return supabase.from("pagamentos").delete().eq("id", id);
}

export function createExpenseRecord(clinicId: string, values: ExpenseInput) {
  return supabase.from("despesas").insert({
    clinica_id: clinicId,
    descricao: values.descricao,
    categoria: values.categoria ?? null,
    valor: values.valor,
    status: values.status,
    data: values.data ?? todayISO()
  });
}

export function updateExpenseRecord(id: string, values: ExpenseInput) {
  return supabase.from("despesas").update({
    descricao: values.descricao,
    categoria: values.categoria ?? null,
    valor: values.valor,
    status: values.status,
    data: values.data ?? todayISO()
  }).eq("id", id);
}

export function deleteExpenseRecord(id: string) {
  return supabase.from("despesas").delete().eq("id", id);
}
