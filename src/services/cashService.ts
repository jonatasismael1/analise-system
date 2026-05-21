import { supabase } from "../lib/supabaseClient";
import { todayISO } from "../lib/formatters";

export interface CashEntry {
  id: string;
  descricao: string;
  valor: number;
  status: string;
  data: string;
  formaPagamento: string | null;
}

export async function loadOperationalCash(clinicId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc("get_operational_cash", {
    target_clinica_id: clinicId,
    start_date: startDate,
    end_date: endDate
  });
  if (error) throw error;
  return (data ?? []).map((row: any): CashEntry => ({
    id: row.id,
    descricao: row.descricao,
    valor: Number(row.valor),
    status: row.status,
    data: row.data,
    formaPagamento: row.forma_pagamento
  }));
}

export async function createOperationalPayment(clinicId: string, values: { descricao: string; valor: number; formaPagamento: string; data?: string }) {
  const { error } = await supabase.rpc("create_operational_payment", {
    target_clinica_id: clinicId,
    payment_description: values.descricao,
    payment_value: values.valor,
    payment_method: values.formaPagamento,
    payment_date: values.data ?? todayISO()
  });
  if (error) throw error;
}

export async function createOperationalExpense(clinicId: string, values: { descricao: string; categoria: string; valor: number; data?: string }) {
  const { error } = await supabase.rpc("create_operational_expense", {
    target_clinica_id: clinicId,
    expense_description: values.descricao,
    expense_value: values.valor,
    expense_category: values.categoria,
    expense_date: values.data ?? todayISO()
  });
  if (error) throw error;
}

export async function closeCashRegister(clinicId: string, cashDate: string, notes: string) {
  const { error } = await supabase.rpc("close_cash_register", {
    target_clinica_id: clinicId,
    cash_date: cashDate,
    notes
  });
  if (error) throw error;
}

