export interface Professional {
  id: string;
  clinicaId?: string;
  nome: string;
  especialidade: string;
  email?: string | null;
  telefone?: string | null;
  registro?: string | null;
  conselho?: string | null;
  fotoUrl?: string;
  horarios?: unknown;
  ativo: boolean;
}

export interface Service {
  id: string;
  clinicaId?: string;
  nome: string;
  duracaoMin: number;
  preco: number;
  profissionalId?: string | null;
  profissionalNome?: string;
  ativo: boolean;
}

export interface Appointment {
  id: string;
  pacienteId?: string | null;
  pacienteWhatsapp?: string | null;
  profissionalId?: string | null;
  servicoId?: string | null;
  pacienteNome: string;
  profissional: string;
  servico: string;
  data: string;
  horario: string;
  status: "pendente" | "confirmado" | "cancelado" | "faltou" | "concluido";
  recorrenciaId?: string | null;
  tipoAtendimento?: "presencial" | "teleconsulta";
}

export interface Patient {
  id: string;
  clinicaId?: string;
  nome: string;
  whatsapp: string;
  email?: string | null;
  cpf?: string | null;
  dataNascimento?: string | null;
  endereco?: string | null;
  status: "ativo" | "inativo" | "retorno_pendente";
  valorTotalGasto: number;
  profissionalId?: string | null;
  ultimoAtendimento?: string | null;
  proximoRetorno?: string | null;
  kanbanStage?: "novo" | "agendado" | "atendido" | "retorno" | "faltou" | "inativo" | null;
  observacoes?: string | null;
  fotoUrl?: string | null;
  convenio?: string | null;
}

export type UserRole = "admin" | "profissional" | "secretaria";

export interface ClinicUser {
  id: string;
  clinicaId: string;
  userId: string | null;
  profissionalId: string | null;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
}

export interface FinanceEntry {
  id: string;
  descricao: string;
  valor: number;
  status: "pago" | "pendente" | "atrasado" | "cancelado";
  tipo?: "pagamento" | "despesa";
  data?: string | null;
  categoria?: string | null;
  pacienteId?: string | null;
  servicoId?: string | null;
  profissionalId?: string | null;
  formaPagamento?: string | null;
}

export type MembershipRole = "holder" | "dependent";
export type MembershipStatus = "active" | "inactive" | "suspended";
export type MembershipRelationship = "filho" | "pai" | "mae" | "conjuge" | "outro";

export interface PatientProgramMembership {
  id: string;
  clinicaId: string;
  patientId: string;
  programId: string;
  role: MembershipRole;
  holderPatientId: string | null;
  relationship: MembershipRelationship | null;
  status: MembershipStatus;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SessionPackage {
  id: string;
  clinicaId?: string;
  pacienteId?: string | null;
  servicoId?: string | null;
  paciente: string;
  servico: string;
  totalSessoes: number;
  sessoesRealizadas: number;
  validade?: string | null;
  status: "ativo" | "finalizado" | "vencido";
}
