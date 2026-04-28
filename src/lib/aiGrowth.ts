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

export function calculateGrowthInsights(input: {
  professionals?: Professional[];
  appointments?: Appointment[];
  patients?: Patient[];
  financeEntries?: FinanceEntry[];
  services?: Service[];
}): GrowthInsight[] {
  const insights: GrowthInsight[] = [];
  const professionals = input.professionals ?? [];
  const appointments = input.appointments ?? [];
  const patients = input.patients ?? [];
  const financeEntries = input.financeEntries ?? [];
  const services = input.services ?? [];

  const confirmed = appointments.filter((item) => item.status === "confirmado" || item.status === "concluido");
  const missed = appointments.filter((item) => item.status === "faltou");
  const overdue = financeEntries.filter((item) => item.status === "atrasado");
  const avgServicePrice = services.length ? services.reduce((sum, item) => sum + item.preco, 0) / services.length : 180;

  professionals.forEach((professional) => {
    const profApps = confirmed.filter((item) => item.profissional === professional.nome).length;
    const occupancy = Math.round((profApps / 40) * 100);
    if (occupancy < 60) {
      insights.push({
        id: `idle-${professional.id}`,
        type: "ociosidade",
        title: `${professional.nome} com ocupação baixa`,
        description: `Ocupação semanal estimada em ${occupancy}%. Sugestão: campanha de retorno para horários de menor demanda.`,
        value: Math.round((40 - profApps) * avgServicePrice),
        professional: professional.nome
      });
    }
  });

  patients.filter((patient) => patient.status !== "ativo").forEach((patient) => {
    insights.push({
      id: `inactive-${patient.id}`,
      type: patient.status === "retorno_pendente" ? "retorno" : "inativo",
      title: patient.status === "retorno_pendente" ? `Retorno pendente: ${patient.nome}` : `Paciente inativo: ${patient.nome}`,
      description: "Acionar paciente com mensagem contextual para recuperar agenda e receita.",
      value: Math.round(avgServicePrice),
      patientName: patient.nome,
      whatsapp: patient.whatsapp
    });
  });

  if (missed.length) {
    insights.push({
      id: "missed-rate",
      type: "falta",
      title: "Faltas recorrentes detectadas",
      description: `${missed.length} falta(s) registrada(s). Reforce a confirmação antecipada por WhatsApp.`,
      value: Math.round(missed.length * avgServicePrice)
    });
  }

  if (overdue.length) {
    insights.push({
      id: "overdue-payments",
      type: "financeiro",
      title: "Pagamentos em atraso",
      description: `${overdue.length} pagamento(s) em atraso impactando o caixa.`,
      value: overdue.reduce((sum, item) => sum + item.valor, 0)
    });
  }

  return insights;
}

/**
 * Gera mensagens contextuais para envio via WhatsApp.
 *
 * NOTA TÉCNICA: A integração oficial futura deve ser feita via
 * WhatsApp Business Cloud API, usando backend seguro, webhooks
 * e templates aprovados. Não utilizar bibliotecas não-oficiais
 * de automação de WhatsApp Web.
 */
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
    return `Olá, ${name}! Aqui é da ${clinicName}. Notamos que você não compareceu à sua consulta. Gostaríamos de remarcar — temos horários disponíveis esta semana. Podemos agendar?`;
  }
  return `Olá, ${name}! Aqui é da ${clinicName}. Temos uma oportunidade de horário com ${insight.professional ?? "nossa equipe"}. Deseja que eu verifique a agenda para você?`;
}

/**
 * Gera mensagem de confirmação de agendamento.
 * Uso: enviar 24h antes da consulta.
 */
export function buildConfirmationMessage(patientName: string, date: string, time: string, professional: string, clinicName: string): string {
  return `Olá, ${patientName}! Aqui é da ${clinicName}. Lembramos que você tem consulta amanhã, ${date} às ${time}, com ${professional}. Confirme sua presença respondendo SIM ou entre em contato para remarcar.`;
}

/**
 * Gera mensagem de pagamento atrasado.
 */
export function buildOverdueMessage(patientName: string, amount: string, clinicName: string): string {
  return `Olá, ${patientName}! Aqui é da ${clinicName}. Identificamos um pagamento pendente no valor de ${amount}. Podemos ajudar com a regularização. Qual seria a melhor forma de pagamento para você?`;
}
