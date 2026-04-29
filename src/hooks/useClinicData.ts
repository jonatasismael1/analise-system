import { useCallback, useEffect, useMemo, useState } from "react";
import {
  mockAppointments,
  mockFinanceEntries,
  mockPackages,
  mockPatients,
  mockProfessionals,
  mockServices
} from "../data/mockData";
import { isDemoMode, productionDataErrorMessage } from "../lib/appConfig";
import { monthBounds } from "../lib/formatters";
import { getErrorMessage } from "../lib/getErrorMessage";
import { supabase } from "../lib/supabaseClient";
import { validateAppointment, validateFinance, validatePatient } from "../lib/validation";
import { deleteAppointmentRecord, saveAppointmentRecord } from "../services/appointmentService";
import { createExpenseRecord, createPaymentRecord, deleteExpenseRecord, deletePaymentRecord, updateExpenseRecord, updatePaymentRecord } from "../services/financeService";
import { deletePatientRecord, importPatientRecords, savePatientRecord } from "../services/patientService";
import type { Appointment, ClinicUser, FinanceEntry, Patient, Professional, Service, SessionPackage, UserRole } from "../types/clinic";
import type { Database } from "../types/database";

type ProfessionalRow = Database["public"]["Tables"]["profissionais"]["Row"];
type ServiceRow = Database["public"]["Tables"]["servicos"]["Row"];
type PatientRow = Database["public"]["Tables"]["pacientes"]["Row"];
type AppointmentRow = Database["public"]["Tables"]["agendamentos"]["Row"];
type PackageRow = Database["public"]["Tables"]["pacotes_sessoes"]["Row"];
type PaymentRow = Database["public"]["Tables"]["pagamentos"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["despesas"]["Row"];

function mapProfessional(row: ProfessionalRow): Professional {
  return { id: row.id, clinicaId: row.clinica_id, nome: row.nome, especialidade: row.especialidade, email: row.email, telefone: row.telefone, registro: row.registro, conselho: row.conselho, fotoUrl: row.foto_url ?? undefined, horarios: row.horarios, ativo: row.ativo };
}

function mapService(row: ServiceRow, professionalName?: string): Service {
  return { id: row.id, clinicaId: row.clinica_id, nome: row.nome, duracaoMin: row.duracao_min, preco: Number(row.preco), profissionalId: row.profissional_id, profissionalNome: professionalName, ativo: row.ativo };
}

function mapPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    clinicaId: row.clinica_id,
    nome: row.nome,
    whatsapp: row.whatsapp,
    email: row.email,
    cpf: row.cpf,
    dataNascimento: row.data_nascimento,
    endereco: row.endereco,
    status: row.status as Patient["status"],
    profissionalId: row.profissional_id,
    ultimoAtendimento: row.ultimo_atendimento,
    proximoRetorno: row.proximo_retorno,
    kanbanStage: row.kanban_stage as Patient["kanbanStage"],
    valorTotalGasto: Number(row.valor_total_gasto),
    observacoes: row.observacoes
  };
}

function statusAsAppointment(value: string): Appointment["status"] {
  if (["pendente", "confirmado", "cancelado", "faltou", "concluido"].includes(value)) return value as Appointment["status"];
  return "pendente";
}

function statusAsFinance(value: string): FinanceEntry["status"] {
  if (["pago", "pendente", "atrasado", "cancelado"].includes(value)) return value as FinanceEntry["status"];
  return "pendente";
}

export function useClinicData(clinicId?: string, role: UserRole = "admin", profileProfessionalId?: string | null) {
  const [professionals, setProfessionals] = useState<Professional[]>(() => isDemoMode ? mockProfessionals : []);
  const [services, setServices] = useState<Service[]>(() => isDemoMode ? mockServices : []);
  const [patients, setPatients] = useState<Patient[]>(() => isDemoMode ? mockPatients : []);
  const [appointments, setAppointments] = useState<Appointment[]>(() => isDemoMode ? mockAppointments : []);
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>(() => isDemoMode ? mockFinanceEntries : []);
  const [packages, setPackages] = useState<SessionPackage[]>(() => isDemoMode ? mockPackages : []);
  const [users, setUsers] = useState<ClinicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    setMessage(null);

    try {
      const canSeeFinance = role === "admin";
      const professionalFilter = role === "profissional" && profileProfessionalId ? profileProfessionalId : null;
      const [professionalsRes, servicesRes, patientsRes, appointmentsRes, packagesRes, paymentsRes, expensesRes, usersRes] = await Promise.all([
        supabase.from("profissionais").select("*").eq("clinica_id", clinicId).order("nome"),
        supabase.from("servicos").select("*").eq("clinica_id", clinicId).order("nome"),
        professionalFilter ? supabase.from("pacientes").select("*").eq("clinica_id", clinicId).eq("profissional_id", professionalFilter).order("nome") : supabase.from("pacientes").select("*").eq("clinica_id", clinicId).order("nome"),
        professionalFilter ? supabase.from("agendamentos").select("*").eq("clinica_id", clinicId).eq("profissional_id", professionalFilter).order("data", { ascending: false }).limit(200) : supabase.from("agendamentos").select("*").eq("clinica_id", clinicId).order("data", { ascending: false }).limit(200),
        supabase.from("pacotes_sessoes").select("*").eq("clinica_id", clinicId).order("created_at", { ascending: false }),
        canSeeFinance ? supabase.from("pagamentos").select("*").eq("clinica_id", clinicId).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
        canSeeFinance ? supabase.from("despesas").select("*").eq("clinica_id", clinicId).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
        role === "admin" ? supabase.from("usuarios").select("*").eq("clinica_id", clinicId).order("nome") : Promise.resolve({ data: [], error: null })
      ]);

      const firstError = [professionalsRes, servicesRes, patientsRes, appointmentsRes, packagesRes, paymentsRes, expensesRes, usersRes].find((res) => res.error)?.error;
      if (firstError) throw firstError;

      const professionalsMapped = (professionalsRes.data ?? []).map(mapProfessional);
      const professionalsById = new Map(professionalsMapped.map((item) => [item.id, item.nome]));
      const servicesMapped = (servicesRes.data ?? []).map((row) => mapService(row, row.profissional_id ? professionalsById.get(row.profissional_id) : undefined));
      const servicesById = new Map(servicesMapped.map((item) => [item.id, item.nome]));
      const patientsMapped = (patientsRes.data ?? []).map(mapPatient);
      const patientsById = new Map(patientsMapped.map((item) => [item.id, item.nome]));

      setProfessionals(professionalsMapped);
      setServices(servicesMapped);
      setPatients(patientsMapped);
      setAppointments((appointmentsRes.data ?? []).map((row: AppointmentRow) => ({
        id: row.id,
        pacienteNome: row.paciente_nome,
        profissional: professionalsById.get(row.profissional_id) ?? "Profissional",
        servico: row.servico_id ? servicesById.get(row.servico_id) ?? "Serviço" : "Serviço",
        data: row.data,
        horario: row.horario.slice(0, 5),
        status: statusAsAppointment(row.status)
      })));
      setPackages((packagesRes.data ?? []).map((row: PackageRow) => ({
        id: row.id,
        clinicaId: row.clinica_id,
        pacienteId: row.paciente_id,
        servicoId: row.servico_id,
        paciente: row.paciente_id ? patientsById.get(row.paciente_id) ?? "Paciente" : "Paciente",
        servico: row.servico_id ? servicesById.get(row.servico_id) ?? "Serviço" : "Serviço",
        totalSessoes: row.total_sessoes,
        sessoesRealizadas: row.sessoes_realizadas,
        validade: row.validade,
        status: row.status as SessionPackage["status"]
      })));

      const payments = (paymentsRes.data ?? []).map((row: PaymentRow & { descricao?: string }) => ({
        id: row.id,
        descricao: row.descricao || `Pagamento ${row.forma_pagamento ?? ""}`.trim() || "Nova Receita",
        valor: Number(row.valor),
        status: statusAsFinance(row.status),
        tipo: "pagamento" as const,
        data: row.data_pagamento ?? row.data_vencimento,
        pacienteId: row.paciente_id,
        servicoId: row.servico_id,
        profissionalId: row.profissional_id,
        formaPagamento: row.forma_pagamento
      }));
      const expenses = (expensesRes.data ?? []).map((row: ExpenseRow) => ({
        id: row.id,
        descricao: row.descricao,
        valor: Number(row.valor),
        status: statusAsFinance(row.status),
        tipo: "despesa" as const,
        data: row.data,
        categoria: row.categoria
      }));
      setFinanceEntries([...payments, ...expenses]);
      setUsers((usersRes.data ?? []).map((row: any) => ({
        id: row.id,
        clinicaId: row.clinica_id,
        userId: row.user_id,
        profissionalId: row.profissional_id,
        nome: row.nome,
        email: row.email,
        role: row.role,
        ativo: row.ativo
      })));
    } catch (error) {
      console.error("Erro ao carregar dados da clínica:", error);
      if (isDemoMode) {
        setProfessionals(mockProfessionals);
        setServices(mockServices);
        setPatients(mockPatients);
        setAppointments(mockAppointments);
        setFinanceEntries(mockFinanceEntries);
        setPackages(mockPackages);
        setMessage("Modo demonstração: usando dados fictícios porque o Supabase não respondeu.");
      } else {
        setProfessionals([]);
        setServices([]);
        setPatients([]);
        setAppointments([]);
        setFinanceEntries([]);
        setPackages([]);
        setUsers([]);
        setMessage(productionDataErrorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [clinicId, profileProfessionalId, role]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function saveProfessional(values: Pick<Professional, "nome" | "especialidade" | "email" | "telefone" | "registro" | "conselho" | "fotoUrl" | "ativo"> & { id?: string }) {
    if (!clinicId) return;
    const payload = { clinica_id: clinicId, nome: values.nome, especialidade: values.especialidade, email: values.email ?? null, telefone: values.telefone ?? null, registro: values.registro ?? null, conselho: values.conselho ?? null, foto_url: values.fotoUrl ?? null, ativo: values.ativo };
    const result = values.id
      ? await supabase.from("profissionais").update(payload).eq("id", values.id)
      : await supabase.from("profissionais").insert(payload);
    if (result.error) setMessage(getErrorMessage(result.error));
    else setMessage("Profissional salvo.");
    await loadAll();
  }

  async function deleteProfessional(id: string) {
    const { error } = await supabase.from("profissionais").delete().eq("id", id);
    setMessage(error ? getErrorMessage(error) : "Profissional removido.");
    await loadAll();
  }

  async function saveService(values: Pick<Service, "nome" | "duracaoMin" | "preco" | "profissionalId" | "ativo"> & { id?: string }) {
    if (!clinicId) return;
    const validation = validateFinance({ valor: values.preco, descricao: values.nome });
    if (!validation.valid) {
      setMessage(validation.message ?? "Revise os dados do serviço.");
      return;
    }
    const payload = { clinica_id: clinicId, nome: values.nome, duracao_min: values.duracaoMin, preco: values.preco, profissional_id: values.profissionalId ?? null, ativo: values.ativo };
    const result = values.id ? await supabase.from("servicos").update(payload).eq("id", values.id) : await supabase.from("servicos").insert(payload);
    setMessage(result.error ? getErrorMessage(result.error) : "Serviço salvo.");
    await loadAll();
  }

  async function deleteService(id: string) {
    const { error } = await supabase.from("servicos").delete().eq("id", id);
    setMessage(error ? getErrorMessage(error) : "Serviço removido.");
    await loadAll();
  }

  async function savePatient(values: Patient & { id?: string }) {
    if (!clinicId) return;
    const validation = validatePatient(values);
    if (!validation.valid) {
      setMessage(validation.message ?? "Revise os dados do paciente.");
      return;
    }
    const result = await savePatientRecord(clinicId, values);
    setMessage(result.error ? getErrorMessage(result.error) : "Paciente salvo.");
    await loadAll();
  }

  async function deletePatient(id: string) {
    const { error } = await deletePatientRecord(id);
    setMessage(error ? getErrorMessage(error) : "Paciente removido.");
    await loadAll();
  }

  async function importPatientsMassively(newPatients: Omit<Patient, "id" | "clinicaId">[]) {
    if (!clinicId) return;
    setLoading(true);
    const invalidPatient = newPatients.find((patient) => !validatePatient(patient).valid);
    if (invalidPatient) {
      setMessage(`Importação interrompida: revise nome e WhatsApp de ${invalidPatient.nome || "um paciente"}.`);
      setLoading(false);
      return;
    }
    const { error, failedBatchStart } = await importPatientRecords(clinicId, newPatients);
    if (error) {
      setMessage(`Erro na importação (lote ${failedBatchStart}): ${getErrorMessage(error)}`);
      setLoading(false);
      return;
    }

    setMessage(`${newPatients.length} pacientes importados com sucesso!`);
    await loadAll();
  }

  async function saveAppointment(values: { id?: string; profissionalId: string; servicoId?: string | null; pacienteId?: string | null; pacienteNome: string; pacienteWhatsapp: string; data: string; horario: string; status: Appointment["status"] }) {
    if (!clinicId) return;
    const validation = validateAppointment(values);
    if (!validation.valid) {
      setMessage(validation.message ?? "Revise os dados do agendamento.");
      return;
    }
    const result = await saveAppointmentRecord(clinicId, values);
    setMessage(result.error ? getErrorMessage(result.error) : "Agendamento salvo.");
    await loadAll();
  }

  async function deleteAppointment(id: string) {
    const { error } = await deleteAppointmentRecord(id);
    setMessage(error ? getErrorMessage(error) : "Agendamento removido.");
    await loadAll();
  }

  async function savePayment(values: { valor: number; status: FinanceEntry["status"]; formaPagamento?: string; pacienteId?: string | null; servicoId?: string | null; profissionalId?: string | null; descricao?: string; data?: string | null }) {
    if (!clinicId) return;
    const validation = validateFinance(values);
    if (!validation.valid) {
      setMessage(validation.message ?? "Revise os dados financeiros.");
      return;
    }
    const { error } = await createPaymentRecord(clinicId, values);
    setMessage(error ? getErrorMessage(error) : "Pagamento criado.");
    await loadAll();
  }

  async function updatePayment(id: string, values: { valor: number; status: FinanceEntry["status"]; formaPagamento?: string | null; pacienteId?: string | null; servicoId?: string | null; profissionalId?: string | null; data?: string | null; descricao?: string }) {
    const validation = validateFinance(values);
    if (!validation.valid) {
      setMessage(validation.message ?? "Revise os dados financeiros.");
      return;
    }
    const { error } = await updatePaymentRecord(id, values);
    setMessage(error ? getErrorMessage(error) : "Pagamento atualizado.");
    await loadAll();
  }

  async function deletePayment(id: string) {
    const { error } = await deletePaymentRecord(id);
    setMessage(error ? getErrorMessage(error) : "Pagamento removido.");
    await loadAll();
  }

  async function saveExpense(values: { descricao: string; categoria?: string; valor: number; status: FinanceEntry["status"]; data?: string | null }) {
    if (!clinicId) return;
    const validation = validateFinance(values);
    if (!validation.valid) {
      setMessage(validation.message ?? "Revise os dados da despesa.");
      return;
    }
    const { error } = await createExpenseRecord(clinicId, values);
    setMessage(error ? getErrorMessage(error) : "Despesa criada.");
    await loadAll();
  }

  async function updateExpense(id: string, values: { descricao: string; categoria?: string | null; valor: number; status: FinanceEntry["status"]; data?: string | null }) {
    const validation = validateFinance(values);
    if (!validation.valid) {
      setMessage(validation.message ?? "Revise os dados da despesa.");
      return;
    }
    const { error } = await updateExpenseRecord(id, values);
    setMessage(error ? getErrorMessage(error) : "Despesa atualizada.");
    await loadAll();
  }

  async function deleteExpense(id: string) {
    const { error } = await deleteExpenseRecord(id);
    setMessage(error ? getErrorMessage(error) : "Despesa removida.");
    await loadAll();
  }

  async function savePackage(values: { pacienteId?: string | null; servicoId?: string | null; totalSessoes: number; sessoesRealizadas?: number; validade?: string | null; status?: SessionPackage["status"] }) {
    if (!clinicId) return;
    const done = values.sessoesRealizadas ?? 0;
    const status = done >= values.totalSessoes ? "finalizado" : values.status ?? "ativo";
    const { error } = await supabase.from("pacotes_sessoes").insert({ clinica_id: clinicId, paciente_id: values.pacienteId ?? null, servico_id: values.servicoId ?? null, total_sessoes: values.totalSessoes, sessoes_realizadas: done, validade: values.validade ?? null, status });
    setMessage(error ? getErrorMessage(error) : "Pacote criado.");
    await loadAll();
  }

  async function updatePackage(id: string, values: { pacienteId?: string | null; servicoId?: string | null; totalSessoes: number; sessoesRealizadas: number; validade?: string | null; status: SessionPackage["status"] }) {
    const { error } = await supabase.from("pacotes_sessoes").update({ paciente_id: values.pacienteId ?? null, servico_id: values.servicoId ?? null, total_sessoes: values.totalSessoes, sessoes_realizadas: values.sessoesRealizadas, validade: values.validade ?? null, status: values.status }).eq("id", id);
    setMessage(error ? getErrorMessage(error) : "Pacote atualizado.");
    await loadAll();
  }

  async function deletePackage(id: string) {
    const { error } = await supabase.from("pacotes_sessoes").delete().eq("id", id);
    setMessage(error ? getErrorMessage(error) : "Pacote removido.");
    await loadAll();
  }

  async function saveUser(values: Omit<ClinicUser, "id" | "clinicaId"> & { id?: string }) {
    if (!clinicId) return;
    const payload = { clinica_id: clinicId, user_id: values.userId || null, profissional_id: values.profissionalId || null, nome: values.nome, email: values.email, role: values.role, ativo: values.ativo };
    const result = values.id ? await supabase.from("usuarios").update(payload).eq("id", values.id) : await supabase.from("usuarios").insert(payload);
    setMessage(result.error ? getErrorMessage(result.error) : "Acesso salvo. Crie o usuário no Supabase Auth e cole o UID aqui para liberar login.");
    await loadAll();
  }

  async function deleteUser(id: string) {
    const { error } = await supabase.from("usuarios").delete().eq("id", id);
    setMessage(error ? getErrorMessage(error) : "Acesso removido.");
    await loadAll();
  }

  async function createStaffUser(values: {
    nome: string;
    email: string;
    password: string;
    role: UserRole;
    profissionalId?: string | null;
    professional?: {
      especialidade: string;
      telefone?: string | null;
      registro?: string | null;
      conselho?: string | null;
      fotoUrl?: string | null;
    };
  }) {
    if (!clinicId) return;
    const { data, error } = await supabase.functions.invoke("create-staff-user", {
      body: {
        clinicaId: clinicId,
        nome: values.nome,
        email: values.email,
        password: values.password,
        role: values.role,
        profissionalId: values.profissionalId || null,
        professional: values.professional ?? null
      }
    });
    setMessage(error ? getErrorMessage(error) : data?.message ?? "Usuário criado com acesso ao SaaS.");
    await loadAll();
  }

  async function registerSession(pkg: SessionPackage) {
    const nextDone = Math.min(pkg.totalSessoes, pkg.sessoesRealizadas + 1);
    const status = nextDone >= pkg.totalSessoes ? "finalizado" : pkg.status;
    const { error } = await supabase.from("pacotes_sessoes").update({ sessoes_realizadas: nextDone, status }).eq("id", pkg.id);
    setMessage(error ? getErrorMessage(error) : "Sessão registrada.");
    await loadAll();
  }

  const financialKpis = useMemo(() => {
    const { start, end } = monthBounds();
    const monthEntries = financeEntries.filter((entry) => !entry.data || (entry.data >= start && entry.data <= end));
    const revenue = monthEntries.filter((entry) => entry.tipo !== "despesa" && entry.status === "pago").reduce((sum, entry) => sum + entry.valor, 0);
    const expenses = monthEntries.filter((entry) => entry.tipo === "despesa").reduce((sum, entry) => sum + entry.valor, 0);
    const overdue = monthEntries.filter((entry) => entry.status === "atrasado").reduce((sum, entry) => sum + entry.valor, 0);
    const forecast = monthEntries.filter((entry) => entry.tipo !== "despesa" && entry.status !== "cancelado").reduce((sum, entry) => sum + entry.valor, 0);
    return { revenue, expenses, profit: revenue - expenses, overdue, forecast };
  }, [financeEntries]);

  return {
    professionals,
    services,
    patients,
    appointments,
    financeEntries,
    packages,
    users,
    loading,
    message,
    financialKpis,
    reload: loadAll,
    saveProfessional,
    deleteProfessional,
    saveService,
    deleteService,
    savePatient,
    deletePatient,
    importPatientsMassively,
    saveAppointment,
    deleteAppointment,
    savePayment,
    updatePayment,
    deletePayment,
    saveExpense,
    updateExpense,
    deleteExpense,
    savePackage,
    updatePackage,
    deletePackage,
    registerSession,
    saveUser,
    deleteUser,
    createStaffUser,
    clearMessage: () => setMessage(null)
  };
}
