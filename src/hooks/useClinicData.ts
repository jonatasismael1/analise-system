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
import { toast } from "../lib/toast";
import { validateAppointment, validateFinance, validatePatient } from "../lib/validation";
import { deleteAppointmentRecord, deleteAppointmentSeriesRecord, saveAppointmentRecord, type RecurrenceFrequency } from "../services/appointmentService";
import { createExpenseRecord, createPaymentRecord, deleteExpenseRecord, deletePaymentRecord, updateExpenseRecord, updatePaymentRecord } from "../services/financeService";
import { deletePatientRecord, importPatientRecords, savePatientRecord } from "../services/patientService";
import type { Appointment, ClinicUser, FinanceEntry, Patient, PatientProgramMembership, MembershipRole, MembershipStatus, Professional, Service, SessionPackage, UserRole } from "../types/clinic";
import type { Database } from "../types/database";
import type { ProgramaDesconto, ProgramaItem, ProgramaForm } from "../pages/admin/modules/DiscountProgramsPanel";
import type { Orcamento, OrcamentoItem, OrcamentoForm } from "../pages/admin/modules/OrcamentosPanel";

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
    observacoes: row.observacoes,
    fotoUrl: (row as Record<string, unknown>).foto_url as string | null ?? null,
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

export function useClinicData(clinicId?: string, role: UserRole | null = null, profileProfessionalId?: string | null) {
  const [professionals, setProfessionals] = useState<Professional[]>(() => isDemoMode ? mockProfessionals : []);
  const [services, setServices] = useState<Service[]>(() => isDemoMode ? mockServices : []);
  const [patients, setPatients] = useState<Patient[]>(() => isDemoMode ? mockPatients : []);
  const [appointments, setAppointments] = useState<Appointment[]>(() => isDemoMode ? mockAppointments : []);
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>(() => isDemoMode ? mockFinanceEntries : []);
  const [packages, setPackages] = useState<SessionPackage[]>(() => isDemoMode ? mockPackages : []);
  const [programas, setProgramas] = useState<ProgramaDesconto[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [memberships, setMemberships] = useState<PatientProgramMembership[]>([]);
  const [users, setUsers] = useState<ClinicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [financeMonths, setFinanceMonths] = useState(3);

  const loadAll = useCallback(async () => {
    if (!clinicId || !role) return;
    setLoading(true);
    setMessage(null);

    try {
      const canSeeFinance = role === "admin";
      const canSeeOwnRevenue = role === "profissional" && Boolean(profileProfessionalId);
      const canSeeOrcamentos = role === "admin" || role === "secretaria";
      const professionalFilter = role === "profissional" && profileProfessionalId ? profileProfessionalId : null;

      // Limite de período para finance: evita carregar histórico completo de anos
      const financeStart = new Date();
      financeStart.setMonth(financeStart.getMonth() - financeMonths);
      const financeStartISO = financeStart.toISOString().slice(0, 10);

      const [professionalsRes, servicesRes, patientsRes, appointmentsRes, packagesRes, paymentsRes, expensesRes, usersRes, programasRes, orcamentosRes, membershipsRes] = await Promise.all([
        supabase.from("profissionais").select("*").eq("clinica_id", clinicId).order("nome"),
        supabase.from("servicos").select("*").eq("clinica_id", clinicId).order("nome"),
        professionalFilter ? supabase.from("pacientes").select("*").eq("clinica_id", clinicId).eq("profissional_id", professionalFilter).order("nome") : supabase.from("pacientes").select("*").eq("clinica_id", clinicId).order("nome"),
        professionalFilter ? supabase.from("agendamentos").select("*").eq("clinica_id", clinicId).eq("profissional_id", professionalFilter).order("data", { ascending: false }).limit(200) : supabase.from("agendamentos").select("*").eq("clinica_id", clinicId).order("data", { ascending: false }).limit(200),
        supabase.from("pacotes_sessoes").select("*").eq("clinica_id", clinicId).order("created_at", { ascending: false }),
        canSeeFinance
          ? supabase.from("pagamentos").select("*").eq("clinica_id", clinicId).gte("created_at", financeStartISO).order("created_at", { ascending: false })
          : canSeeOwnRevenue
            ? supabase.from("pagamentos").select("*").eq("clinica_id", clinicId).eq("profissional_id", profileProfessionalId as string).gte("created_at", financeStartISO).order("created_at", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
        canSeeFinance ? supabase.from("despesas").select("*").eq("clinica_id", clinicId).gte("created_at", financeStartISO).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
        role === "admin" ? supabase.from("usuarios").select("*").eq("clinica_id", clinicId).order("nome") : Promise.resolve({ data: [], error: null }),
        canSeeOrcamentos ? supabase.from("programas_desconto").select("*, programas_desconto_servicos(*)").eq("clinica_id", clinicId).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
        canSeeOrcamentos ? supabase.from("orcamentos").select("*, orcamentos_itens(*)").eq("clinica_id", clinicId).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
        supabase.from("patient_program_memberships").select("*").eq("clinica_id", clinicId).eq("status", "active")
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
        pacienteId: row.paciente_id,
        pacienteWhatsapp: row.paciente_whatsapp,
        profissionalId: row.profissional_id,
        servicoId: row.servico_id,
        pacienteNome: row.paciente_nome,
        profissional: professionalsById.get(row.profissional_id) ?? "Profissional",
        servico: row.servico_id ? servicesById.get(row.servico_id) ?? "Serviço" : "Serviço",
        data: row.data,
        horario: row.horario.slice(0, 5),
        status: statusAsAppointment(row.status),
        recorrenciaId: row.recorrencia_id,
        tipoAtendimento: ((row as any).tipo_atendimento as "presencial" | "teleconsulta" | undefined) ?? "presencial"
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

      // Mapeia programas de desconto com seus itens
      setProgramas((programasRes.data ?? []).map((row: any): ProgramaDesconto => ({
        id: row.id,
        clinicaId: row.clinica_id,
        nome: row.nome,
        descricao: row.descricao ?? "",
        valorTotal: row.programas_desconto_servicos
          ? (row.programas_desconto_servicos as any[]).reduce((s: number, i: any) => s + Number(i.preco_individual), 0)
          : Number(row.valor_total ?? 0),
        valorComDesconto: Number(row.valor_com_desconto),
        ativo: row.ativo,
        itens: ((row.programas_desconto_servicos ?? []) as any[]).map((i: any): ProgramaItem => ({
          id: i.id,
          servicoId: i.servico_id,
          nomeServico: i.nome_servico,
          descricao: i.descricao ?? "",
          precoIndividual: Number(i.preco_individual),
          ordem: i.ordem
        })).sort((a, b) => a.ordem - b.ordem)
      })));

      // Mapeia orçamentos com seus itens
      setOrcamentos((orcamentosRes.data ?? []).map((row: any): Orcamento => ({
        id: row.id,
        clinicaId: row.clinica_id,
        pacienteId: row.paciente_id,
        pacienteNome: row.paciente_nome,
        pacienteCpf: row.paciente_cpf ?? "",
        pacienteWhatsapp: row.paciente_whatsapp ?? "",
        atendenteNome: row.atendente_nome ?? "",
        observacoes: row.observacoes ?? "",
        valorTotal: Number(row.valor_total),
        valorComDesconto: row.valor_com_desconto !== null ? Number(row.valor_com_desconto) : null,
        tokenPublico: row.token_publico,
        status: row.status as Orcamento["status"],
        validade: row.validade,
        createdAt: row.created_at,
        itens: ((row.orcamentos_itens ?? []) as any[]).map((i: any): OrcamentoItem => ({
          id: i.id,
          servicoId: i.servico_id,
          programaId: i.programa_id,
          nome: i.nome,
          descricao: i.descricao ?? "",
          precoIndividual: Number(i.preco_individual),
          quantidade: i.quantidade,
          tipo: i.tipo as OrcamentoItem["tipo"]
        }))
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
      setMemberships((membershipsRes.data ?? []).map((row: any): PatientProgramMembership => ({
        id: row.id,
        clinicaId: row.clinica_id,
        patientId: row.patient_id,
        programId: row.program_id,
        role: row.role as MembershipRole,
        holderPatientId: row.holder_patient_id,
        relationship: row.relationship,
        status: row.status as MembershipStatus,
        startDate: row.start_date,
        endDate: row.end_date,
        notes: row.notes,
        createdAt: row.created_at,
      })));

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
  }, [clinicId, financeMonths, profileProfessionalId, role]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Realtime: recarrega agendamentos e pacientes quando outro usuário faz alterações
  useEffect(() => {
    if (!clinicId || isDemoMode) return;
    let debounceTimer: ReturnType<typeof setTimeout>;
    function scheduleReload() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { void loadAll(); }, 1500);
    }
    const channel = supabase
      .channel(`clinic-realtime-${clinicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos", filter: `clinica_id=eq.${clinicId}` }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "pacientes", filter: `clinica_id=eq.${clinicId}` }, scheduleReload)
      .subscribe();
    return () => {
      clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [clinicId, loadAll]);

  async function anonymizePatient(patientId: string) {
    if (!clinicId) return;
    const { error } = await supabase.rpc("anonimizar_paciente", { p_patient_id: patientId, p_clinica_id: clinicId });
    if (error) toast.error(getErrorMessage(error));
    else toast.success("Paciente anonimizado com sucesso. Dados pessoais removidos.");
    await loadAll();
  }

  async function saveProfessional(values: Pick<Professional, "nome" | "especialidade" | "email" | "telefone" | "registro" | "conselho" | "fotoUrl" | "ativo"> & { id?: string }) {
    if (!clinicId) return;
    const payload = { clinica_id: clinicId, nome: values.nome, especialidade: values.especialidade, email: values.email ?? null, telefone: values.telefone ?? null, registro: values.registro ?? null, conselho: values.conselho ?? null, foto_url: values.fotoUrl ?? null, ativo: values.ativo };
    const result = values.id
      ? await supabase.from("profissionais").update(payload).eq("id", values.id)
      : await supabase.from("profissionais").insert(payload);
    if (result.error) toast.error(getErrorMessage(result.error));
    else toast.success("Profissional salvo com sucesso.");
    await loadAll();
  }

  async function deleteProfessional(id: string) {
    const { error } = await supabase.from("profissionais").delete().eq("id", id);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Profissional removido.");
    await loadAll();
  }

  async function saveService(values: Pick<Service, "nome" | "duracaoMin" | "preco" | "profissionalId" | "ativo"> & { id?: string }) {
    if (!clinicId) return;
    const validation = validateFinance({ valor: values.preco, descricao: values.nome });
    if (!validation.valid) { toast.warning(validation.message ?? "Revise os dados do serviço."); return; }
    const payload = { clinica_id: clinicId, nome: values.nome, duracao_min: values.duracaoMin, preco: values.preco, profissional_id: values.profissionalId ?? null, ativo: values.ativo };
    const result = values.id ? await supabase.from("servicos").update(payload).eq("id", values.id) : await supabase.from("servicos").insert(payload);
    if (result.error) toast.error(getErrorMessage(result.error)); else toast.success("Serviço salvo com sucesso.");
    await loadAll();
  }

  async function deleteService(id: string) {
    const { error } = await supabase.from("servicos").delete().eq("id", id);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Serviço removido.");
    await loadAll();
  }

  async function savePatient(values: Patient & { id?: string }) {
    if (!clinicId) return;
    const validation = validatePatient(values);
    if (!validation.valid) { toast.warning(validation.message ?? "Revise os dados do paciente."); return; }
    const result = await savePatientRecord(clinicId, values);
    if (result.error) toast.error(getErrorMessage(result.error)); else toast.success("Paciente salvo com sucesso.");
    await loadAll();
  }

  async function deletePatient(id: string) {
    const { error } = await deletePatientRecord(id);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Paciente removido.");
    await loadAll();
  }

  async function importPatientsMassively(newPatients: Omit<Patient, "id" | "clinicaId">[]) {
    if (!clinicId) return;
    setLoading(true);
    const invalidPatient = newPatients.find((patient) => !validatePatient(patient).valid);
    if (invalidPatient) {
      toast.error(`Importação interrompida: revise nome e WhatsApp de ${invalidPatient.nome || "um paciente"}.`);
      setLoading(false);
      return;
    }
    const { error, failedBatchStart } = await importPatientRecords(clinicId, newPatients);
    if (error) {
      toast.error(`Erro na importação (lote ${failedBatchStart}): ${getErrorMessage(error)}`);
      setLoading(false);
      return;
    }
    toast.success(`${newPatients.length} pacientes importados com sucesso!`);
    await loadAll();
  }

  async function saveAppointment(values: { id?: string; profissionalId: string; servicoId?: string | null; pacienteId?: string | null; pacienteNome: string; pacienteWhatsapp: string; data: string; horario: string; status: Appointment["status"]; tipoAtendimento?: "presencial" | "teleconsulta"; recorrencia?: { frequency: RecurrenceFrequency; occurrences: number } }): Promise<boolean> {
    if (!clinicId) return false;
    const validation = validateAppointment(values);
    if (!validation.valid) { toast.warning(validation.message ?? "Revise os dados do agendamento."); return false; }
    const result = await saveAppointmentRecord(clinicId, values);
    if (result.error) { toast.error(getErrorMessage(result.error)); return false; }
    const createdCount = values.recorrencia && values.recorrencia.frequency !== "none" ? values.recorrencia.occurrences : 1;
    toast.success(createdCount > 1 ? `${createdCount} agendamentos recorrentes criados.` : "Agendamento salvo com sucesso.");
    await loadAll();
    return true;
  }

  async function deleteAppointment(id: string) {
    const { error } = await deleteAppointmentRecord(id);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Agendamento removido.");
    await loadAll();
  }

  async function deleteAppointmentSeries(recorrenciaId: string) {
    const { error } = await deleteAppointmentSeriesRecord(recorrenciaId);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Série recorrente removida.");
    await loadAll();
  }

  async function savePayment(values: { valor: number; status: FinanceEntry["status"]; formaPagamento?: string; pacienteId?: string | null; servicoId?: string | null; profissionalId?: string | null; descricao?: string; data?: string | null }) {
    if (!clinicId) return;
    const validation = validateFinance(values);
    if (!validation.valid) { toast.warning(validation.message ?? "Revise os dados financeiros."); return; }
    const { error } = await createPaymentRecord(clinicId, values);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Pagamento registrado.");
    await loadAll();
  }

  async function updatePayment(id: string, values: { valor: number; status: FinanceEntry["status"]; formaPagamento?: string | null; pacienteId?: string | null; servicoId?: string | null; profissionalId?: string | null; data?: string | null; descricao?: string }) {
    const validation = validateFinance(values);
    if (!validation.valid) { toast.warning(validation.message ?? "Revise os dados financeiros."); return; }
    const { error } = await updatePaymentRecord(id, values);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Pagamento atualizado.");
    await loadAll();
  }

  async function deletePayment(id: string) {
    const { error } = await deletePaymentRecord(id);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Pagamento removido.");
    await loadAll();
  }

  async function saveExpense(values: { descricao: string; categoria?: string; valor: number; status: FinanceEntry["status"]; data?: string | null }) {
    if (!clinicId) return;
    const validation = validateFinance(values);
    if (!validation.valid) { toast.warning(validation.message ?? "Revise os dados da despesa."); return; }
    const { error } = await createExpenseRecord(clinicId, values);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Despesa registrada.");
    await loadAll();
  }

  async function updateExpense(id: string, values: { descricao: string; categoria?: string | null; valor: number; status: FinanceEntry["status"]; data?: string | null }) {
    const validation = validateFinance(values);
    if (!validation.valid) { toast.warning(validation.message ?? "Revise os dados da despesa."); return; }
    const { error } = await updateExpenseRecord(id, values);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Despesa atualizada.");
    await loadAll();
  }

  async function deleteExpense(id: string) {
    const { error } = await deleteExpenseRecord(id);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Despesa removida.");
    await loadAll();
  }

  async function savePackage(values: { pacienteId?: string | null; servicoId?: string | null; totalSessoes: number; sessoesRealizadas?: number; validade?: string | null; status?: SessionPackage["status"] }) {
    if (!clinicId) return;
    const done = values.sessoesRealizadas ?? 0;
    const status = done >= values.totalSessoes ? "finalizado" : values.status ?? "ativo";
    const { error } = await supabase.from("pacotes_sessoes").insert({ clinica_id: clinicId, paciente_id: values.pacienteId ?? null, servico_id: values.servicoId ?? null, total_sessoes: values.totalSessoes, sessoes_realizadas: done, validade: values.validade ?? null, status });
    if (error) toast.error(getErrorMessage(error)); else toast.success("Pacote criado.");
    await loadAll();
  }

  async function updatePackage(id: string, values: { pacienteId?: string | null; servicoId?: string | null; totalSessoes: number; sessoesRealizadas: number; validade?: string | null; status: SessionPackage["status"] }) {
    const { error } = await supabase.from("pacotes_sessoes").update({ paciente_id: values.pacienteId ?? null, servico_id: values.servicoId ?? null, total_sessoes: values.totalSessoes, sessoes_realizadas: values.sessoesRealizadas, validade: values.validade ?? null, status: values.status }).eq("id", id);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Pacote atualizado.");
    await loadAll();
  }

  async function deletePackage(id: string) {
    const { error } = await supabase.from("pacotes_sessoes").delete().eq("id", id);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Pacote removido.");
    await loadAll();
  }

  async function saveUser(values: Omit<ClinicUser, "id" | "clinicaId"> & { id?: string }) {
    if (!clinicId) return;
    const payload = { clinica_id: clinicId, user_id: values.userId || null, profissional_id: values.profissionalId || null, nome: values.nome, email: values.email, role: values.role, ativo: values.ativo };
    const result = values.id ? await supabase.from("usuarios").update(payload).eq("id", values.id) : await supabase.from("usuarios").insert(payload);
    if (result.error) toast.error(getErrorMessage(result.error)); else toast.success("Acesso salvo.");
    await loadAll();
  }

  async function deleteUser(id: string) {
    const { error } = await supabase.from("usuarios").delete().eq("id", id);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Acesso removido.");
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
    if (error) toast.error(getErrorMessage(error)); else toast.success(data?.message ?? "Usuário criado com acesso ao sistema.");
    await loadAll();
  }

  async function registerSession(pkg: SessionPackage) {
    const nextDone = Math.min(pkg.totalSessoes, pkg.sessoesRealizadas + 1);
    const status = nextDone >= pkg.totalSessoes ? "finalizado" : pkg.status;
    const { error } = await supabase.from("pacotes_sessoes").update({ sessoes_realizadas: nextDone, status }).eq("id", pkg.id);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Sessão registrada.");
    await loadAll();
  }

  async function savePrograma(form: ProgramaForm) {
    if (!clinicId) return;
    const valorTotal = form.itens.reduce((s, i) => s + i.precoIndividual, 0);
    let programaId = form.id;
    if (form.id) {
      const { error } = await supabase.from("programas_desconto").update({ nome: form.nome, descricao: form.descricao, valor_total: valorTotal, valor_com_desconto: form.valorComDesconto, ativo: form.ativo }).eq("id", form.id);
      if (error) { toast.error(getErrorMessage(error)); return; }
      await supabase.from("programas_desconto_servicos").delete().eq("programa_id", form.id);
    } else {
      const { data, error } = await supabase.from("programas_desconto").insert({ clinica_id: clinicId, nome: form.nome, descricao: form.descricao, valor_total: valorTotal, valor_com_desconto: form.valorComDesconto, ativo: form.ativo }).select("id").single();
      if (error || !data) { toast.error(getErrorMessage(error)); return; }
      programaId = data.id as string;
    }
    if (form.itens.length > 0 && programaId) {
      const itens = form.itens.map((item, idx) => ({ programa_id: programaId, clinica_id: clinicId, servico_id: item.servicoId, nome_servico: item.nomeServico, descricao: item.descricao, preco_individual: item.precoIndividual, ordem: idx }));
      const { error } = await supabase.from("programas_desconto_servicos").insert(itens);
      if (error) { toast.error(getErrorMessage(error)); return; }
    }
    toast.success(form.id ? "Programa atualizado." : "Programa criado.");
    await loadAll();
  }

  async function deletePrograma(id: string) {
    const { error } = await supabase.from("programas_desconto").delete().eq("id", id);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Programa removido.");
    await loadAll();
  }

  async function saveOrcamento(form: OrcamentoForm) {
    if (!clinicId) return;
    const valorTotal = form.itens.reduce((s, i) => s + i.precoIndividual * i.quantidade, 0);
    const { data: orc, error } = await supabase.from("orcamentos").insert({
      clinica_id: clinicId,
      paciente_nome: form.pacienteNome,
      paciente_cpf: form.pacienteCpf || null,
      paciente_whatsapp: form.pacienteWhatsapp || null,
      atendente_nome: form.atendenteNome,
      observacoes: form.observacoes || null,
      valor_total: valorTotal,
      valor_com_desconto: form.valorComDesconto,
      validade: form.validade || null
    }).select("id").single();
    if (error || !orc) { toast.error(getErrorMessage(error)); return; }
    if (form.itens.length > 0) {
      const itens = form.itens.map((i) => ({
        orcamento_id: orc.id as string,
        clinica_id: clinicId,
        servico_id: i.servicoId,
        programa_id: i.programaId,
        nome: i.nome,
        descricao: i.descricao || null,
        preco_individual: i.precoIndividual,
        quantidade: i.quantidade,
        tipo: i.tipo
      }));
      const { error: iErr } = await supabase.from("orcamentos_itens").insert(itens);
      if (iErr) { toast.error(getErrorMessage(iErr)); return; }
    }
    toast.success("Orçamento criado com sucesso.");
    await loadAll();
  }

  async function deleteOrcamento(id: string) {
    const { error } = await supabase.from("orcamentos").delete().eq("id", id);
    if (error) toast.error(getErrorMessage(error)); else toast.success("Orçamento removido.");
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
    programas,
    orcamentos,
    memberships,
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
    deleteAppointmentSeries,
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
    savePrograma,
    deletePrograma,
    saveOrcamento,
    deleteOrcamento,
    saveUser,
    deleteUser,
    createStaffUser,
    anonymizePatient,
    financeMonths,
    setFinanceMonths,
    clearMessage: () => setMessage(null)
  };
}
