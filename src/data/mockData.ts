import type {
  Appointment,
  FinanceEntry,
  Patient,
  Professional,
  Service,
  SessionPackage
} from "../types/clinic";

export const mockProfessionals: Professional[] = [
  { id: "prof-1", nome: "Dra. Marina Alves", especialidade: "Dermatologia", ativo: true },
  { id: "prof-2", nome: "Dr. Rafael Costa", especialidade: "Fisioterapia", ativo: true }
];

export const mockServices: Service[] = [
  { id: "serv-1", nome: "Consulta inicial", duracaoMin: 50, preco: 280, profissionalId: "prof-1", ativo: true },
  { id: "serv-2", nome: "Sessão de retorno", duracaoMin: 30, preco: 180, profissionalId: "prof-2", ativo: true }
];

export const mockAppointments: Appointment[] = [
  {
    id: "ag-1",
    pacienteNome: "Bianca Lima",
    profissional: "Dra. Marina Alves",
    servico: "Consulta inicial",
    data: "2026-04-28",
    horario: "10:00",
    status: "confirmado"
  }
];

export const mockPatients: Patient[] = [
  { id: "pac-1", nome: "Bianca Lima", whatsapp: "11999999999", status: "ativo", valorTotalGasto: 1280 }
];

export const mockFinanceEntries: FinanceEntry[] = [
  { id: "fin-1", descricao: "Consulta inicial - Bianca Lima", valor: 280, status: "pago" },
  { id: "fin-2", descricao: "Retorno pendente - Carlos Souza", valor: 180, status: "pendente" }
];

export const mockPackages: SessionPackage[] = [
  { id: "pkg-1", paciente: "Bianca Lima", servico: "Fisioterapia", totalSessoes: 10, sessoesRealizadas: 6, status: "ativo" }
];
