import type { Appointment, FinanceEntry, Patient, Professional, Service } from "../types/clinic";

export interface GrowthInsight {
  id: string;
  type: "ociosidade" | "inativo" | "retorno" | "falta" | "financeiro";
  title: string;
  description: string;
  value: number;
  patientName?: string;
  whatsapp?: string;
  professional?: string;
  service?: string;
}

export interface PatientRisk {
  id: string;
  nome: string;
  whatsapp?: string;
  motivo: string;
  valorPotencial: number;
  acaoRecomendada: string;
  insight: GrowthInsight;
}

export interface GrowthAnalysis {
  insights: GrowthInsight[];
  pacientesEmRisco: PatientRisk[];
  ticketMedio: number;
  taxaRecuperacao: number;
  recuperacaoPrevista: number;
  oportunidades: {
    retornosVencidos: number;
    faltas: number;
    inativos: number;
    atrasoFinanceiro: number;
  };
}

function average(values: number[], fallback: number) {
  const validValues = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!validValues.length) return fallback;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function calculateAverageTicket(financeEntries: FinanceEntry[], services: Service[], patients: Patient[]) {
  const paidRevenue = financeEntries
    .filter((entry) => entry.tipo !== "despesa" && entry.status === "pago")
    .map((entry) => entry.valor);

  if (paidRevenue.length) return average(paidRevenue, 180);
  if (services.length) return average(services.map((service) => service.preco), 180);

  return average(patients.map((patient) => patient.valorTotalGasto), 180);
}

export function calculateGrowthInsights(input: {
  professionals?: Professional[];
  appointments?: Appointment[];
  patients?: Patient[];
  financeEntries?: FinanceEntry[];
  services?: Service[];
}): GrowthAnalysis {
  const insights: GrowthInsight[] = [];
  const pacientesEmRisco: PatientRisk[] = [];
  const professionals = input.professionals ?? [];
  const appointments = input.appointments ?? [];
  const patients = input.patients ?? [];
  const financeEntries = input.financeEntries ?? [];
  const services = input.services ?? [];

  const confirmed = appointments.filter((item) => item.status === "confirmado" || item.status === "concluido");
  const missed = appointments.filter((item) => item.status === "faltou");
  const overdue = financeEntries.filter((item) => item.status === "atrasado");
  const ticketMedio = calculateAverageTicket(financeEntries, services, patients);
  const taxaRecuperacao = 0.35;

  professionals.forEach((professional) => {
    const profApps = confirmed.filter((item) => item.profissional === professional.nome).length;
    const occupancy = Math.round((profApps / 40) * 100);
    if (occupancy < 60) {
      insights.push({
        id: `idle-${professional.id}`,
        type: "ociosidade",
        title: `${professional.nome} com ocupação baixa`,
        description: `Ocupação semanal estimada em ${occupancy}%. Sugestão: campanha de retorno para horários de menor demanda.`,
        value: Math.round((40 - profApps) * ticketMedio),
        professional: professional.nome
      });
    }
  });

  patients.forEach((patient) => {
    if (patient.status === "ativo") return;

    const isReturn = patient.status === "retorno_pendente";
    const insight: GrowthInsight = {
      id: `risk-${patient.id}`,
      type: isReturn ? "retorno" : "inativo",
      title: isReturn ? `Retorno pendente: ${patient.nome}` : `Paciente inativo: ${patient.nome}`,
      description: isReturn
        ? "Paciente com retorno pendente. Priorize contato para recuperar agenda."
        : "Paciente inativo. Reative com mensagem contextual e oferta de horário.",
      value: Math.round(ticketMedio),
      patientName: patient.nome,
      whatsapp: patient.whatsapp
    };

    insights.push(insight);
    pacientesEmRisco.push({
      id: patient.id,
      nome: patient.nome,
      whatsapp: patient.whatsapp,
      motivo: isReturn ? "Retorno pendente" : "Paciente inativo",
      valorPotencial: Math.round(ticketMedio),
      acaoRecomendada: isReturn ? "Enviar convite para agendar retorno" : "Enviar campanha de reativação",
      insight
    });
  });

  if (missed.length) {
    const insight: GrowthInsight = {
      id: "missed-rate",
      type: "falta",
      title: "Faltas recorrentes detectadas",
      description: `${missed.length} falta(s) registrada(s). Reforce a confirmação antecipada por WhatsApp.`,
      value: Math.round(missed.length * ticketMedio)
    };
    insights.push(insight);
  }

  if (overdue.length) {
    const totalOverdue = overdue.reduce((sum, item) => sum + item.valor, 0);
    insights.push({
      id: "overdue-payments",
      type: "financeiro",
      title: "Pagamentos em atraso",
      description: `${overdue.length} pagamento(s) em atraso impactando o caixa.`,
      value: totalOverdue
    });
  }

  const recuperacaoPrevista = Math.round(pacientesEmRisco.length * ticketMedio * taxaRecuperacao);

  return {
    insights,
    pacientesEmRisco,
    ticketMedio,
    taxaRecuperacao,
    recuperacaoPrevista,
    oportunidades: {
      retornosVencidos: pacientesEmRisco.filter((patient) => patient.insight.type === "retorno").length,
      faltas: missed.length,
      inativos: pacientesEmRisco.filter((patient) => patient.insight.type === "inativo").length,
      atrasoFinanceiro: overdue.length
    }
  };
}

export function buildWhatsAppMessage(insight: GrowthInsight, clinicName: string): string {
  const name = insight.patientName ?? "prezado(a)";
  if (insight.type === "financeiro") {
    return `Olá, ${name}! Aqui é da ${clinicName}. Identificamos uma pendência financeira e podemos ajudar com a regularização. Deseja que eu envie os detalhes?`;
  }
  if (insight.type === "retorno") {
    return `Olá, ${name}! Aqui é da ${clinicName}. Percebemos que seu retorno está pendente e temos horários disponíveis esta semana. Posso verificar o melhor horário para você?`;
  }
  if (insight.type === "inativo") {
    return `Olá, ${name}! Aqui é da ${clinicName}. Sentimos sua falta e temos horários disponíveis para continuidade do seu cuidado. Posso te ajudar a agendar?`;
  }
  if (insight.type === "falta") {
    return `Olá, ${name}! Aqui é da ${clinicName}. Notamos que você não compareceu à sua consulta. Gostaríamos de remarcar. Temos horários disponíveis esta semana. Podemos agendar?`;
  }
  return `Olá, ${name}! Aqui é da ${clinicName}. Temos uma oportunidade de horário com ${insight.professional ?? "nossa equipe"}. Deseja que eu verifique a agenda para você?`;
}

export function buildConfirmationMessage(patientName: string, date: string, time: string, professional: string, clinicName: string): string {
  return `Olá, ${patientName}! Aqui é da ${clinicName}. Lembramos que você tem consulta amanhã, ${date} às ${time}, com ${professional}. Confirme sua presença respondendo SIM ou entre em contato para remarcar.`;
}

export function buildOverdueMessage(patientName: string, amount: string, clinicName: string): string {
  return `Olá, ${patientName}! Aqui é da ${clinicName}. Identificamos um pagamento pendente no valor de ${amount}. Podemos ajudar com a regularização. Qual seria a melhor forma de pagamento para você?`;
}
