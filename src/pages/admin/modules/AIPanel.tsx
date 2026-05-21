import { useMemo, useState } from "react";
import { Bot, CalendarClock, Check, Copy, FileText, MessageSquare, RefreshCcw, Sparkles, Stethoscope, TrendingUp } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { buildConfirmationMessage, type GrowthAnalysis } from "../../../lib/aiGrowth";
import { brl, todayISO, whatsappUrl } from "../../../lib/formatters";
import { askDeby } from "../../../services/debyService";
import type { Appointment, FinanceEntry, Patient, Professional, Service, UserRole } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";
import { StatusPill } from "../components/StatusPill";

interface AIPanelProps {
  readonly role: UserRole;
  readonly clinicId: string;
  readonly clinicName: string;
  readonly appointments: Appointment[];
  readonly patients: Patient[];
  readonly professionals: Professional[];
  readonly services: Service[];
  readonly financeEntries: FinanceEntry[];
  readonly growthAnalysis: GrowthAnalysis;
  readonly profileProfessionalId?: string | null;
}

interface MessageCandidate {
  id: string;
  title: string;
  subtitle: string;
  status?: string;
  whatsapp?: string | null;
  message: string;
}

function parseDateTime(item: Appointment) {
  return `${item.data}T${item.horario || "00:00"}`;
}

function isFutureOrToday(date: string) {
  return date >= todayISO();
}

function copyText(text: string, onCopied: () => void) {
  void navigator.clipboard.writeText(text);
  onCopied();
}

function patientWhatsapp(appointment: Appointment, patients: Patient[]) {
  if (appointment.pacienteWhatsapp) return appointment.pacienteWhatsapp;
  if (appointment.pacienteId) return patients.find((patient) => patient.id === appointment.pacienteId)?.whatsapp ?? null;
  return patients.find((patient) => patient.nome === appointment.pacienteNome)?.whatsapp ?? null;
}

function appointmentMessage(appointment: Appointment, clinicName: string) {
  return buildConfirmationMessage(appointment.pacienteNome, appointment.data, appointment.horario, appointment.profissional, clinicName);
}

function missedMessage(appointment: Appointment, clinicName: string) {
  return `Ola, ${appointment.pacienteNome}! Aqui e da ${clinicName}. Notamos que voce nao compareceu ao atendimento de ${appointment.data} as ${appointment.horario}. Podemos remarcar um novo horario?`;
}

function inactivePatientMessage(patient: Patient, clinicName: string) {
  if (patient.status === "retorno_pendente") {
    return `Ola, ${patient.nome}! Aqui e da ${clinicName}. Seu retorno esta pendente e queremos dar continuidade ao seu cuidado. Posso te ajudar a encontrar um horario?`;
  }
  return `Ola, ${patient.nome}! Aqui e da ${clinicName}. Sentimos sua falta e temos horarios disponiveis para retomar seu acompanhamento. Posso te ajudar a agendar?`;
}

function KpiCard({ label, value, detail }: { readonly label: string; readonly value: string | number; readonly detail?: string }) {
  return (
    <div className="rounded-lg border border-border-strong bg-surface-low p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
      {detail ? <p className="mt-1 text-xs text-ink-secondary">{detail}</p> : null}
    </div>
  );
}

function MessageRow({
  candidate,
  copied,
  improving,
  onCopy,
  onImprove
}: {
  readonly candidate: MessageCandidate;
  readonly copied: boolean;
  readonly improving: boolean;
  readonly onCopy: () => void;
  readonly onImprove?: () => void;
}) {
  return (
    <article className="rounded-lg border border-border-strong bg-surface p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {candidate.status ? <StatusPill value={candidate.status} /> : null}
            <h3 className="font-semibold text-ink">{candidate.title}</h3>
          </div>
          <p className="mt-1 text-sm text-ink-secondary">{candidate.subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-ink-secondary transition hover:border-primary hover:text-primary"
            onClick={onCopy}
            type="button"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
          {onImprove ? (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-ink-secondary transition hover:border-primary hover:text-primary disabled:opacity-60"
              disabled={improving}
              onClick={onImprove}
              type="button"
            >
              {improving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Melhorar
            </button>
          ) : null}
          {candidate.whatsapp ? (
            <a
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
              href={whatsappUrl(candidate.whatsapp, candidate.message)}
              rel="noreferrer"
              target="_blank"
            >
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-border-divider bg-surface-container-low p-3 text-sm leading-relaxed text-ink-secondary">
        {candidate.message}
      </div>
    </article>
  );
}

function AdminDebyView({ appointments, patients, professionals, services, financeEntries, growthAnalysis, clinicName }: AIPanelProps) {
  const today = todayISO();
  const monthAppointments = appointments.filter((item) => item.data.slice(0, 7) === today.slice(0, 7));
  const completed = monthAppointments.filter((item) => item.status === "concluido").length;
  const confirmed = monthAppointments.filter((item) => item.status === "confirmado").length;
  const missed = monthAppointments.filter((item) => item.status === "faltou").length;
  const paidRevenue = financeEntries.filter((entry) => entry.tipo !== "despesa" && entry.status === "pago").reduce((sum, entry) => sum + entry.valor, 0);
  const expenses = financeEntries.filter((entry) => entry.tipo === "despesa").reduce((sum, entry) => sum + entry.valor, 0);
  const overdue = financeEntries.filter((entry) => entry.status === "atrasado").reduce((sum, entry) => sum + entry.valor, 0);
  const activePatients = patients.filter((patient) => patient.status === "ativo").length;
  const inactivePatients = patients.filter((patient) => patient.status !== "ativo").length;
  const occupancy = professionals.length ? Math.round(((completed + confirmed) / (professionals.length * 40)) * 100) : 0;

  const recommendations = [
    missed > 0 ? `Reforcar confirmacao ativa: ${missed} falta(s) no mes indicam risco de agenda perdida.` : null,
    inactivePatients > 0 ? `Priorizar reativacao: ${inactivePatients} paciente(s) inativos ou com retorno pendente.` : null,
    overdue > 0 ? `Acionar financeiro: ${brl.format(overdue)} em pendencias podem afetar o caixa.` : null,
    occupancy < 60 && professionals.length > 0 ? `Ocupacao estimada em ${occupancy}%. Direcione campanhas para horarios ociosos.` : null,
    services.length > professionals.length ? "Cruzar servicos de maior ticket com profissionais de menor ocupacao para preencher agenda." : null
  ].filter(Boolean);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="space-y-5 lg:col-span-8">
        <SectionCard title={`Visao operacional da ${clinicName}`} description="KPIs calculados com os dados carregados da clinica.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Receita paga" value={brl.format(paidRevenue)} detail={`Resultado liquido: ${brl.format(paidRevenue - expenses)}`} />
            <KpiCard label="Agenda no mes" value={monthAppointments.length} detail={`${confirmed} confirmados, ${completed} concluidos`} />
            <KpiCard label="Pacientes ativos" value={activePatients} detail={`${inactivePatients} precisam de acao`} />
            <KpiCard label="Ocupacao estimada" value={`${occupancy}%`} detail={`${professionals.length} profissional(is)`} />
          </div>
        </SectionCard>

        <SectionCard title="Recomendacoes acionaveis" description="Prioridades operacionais para agenda, pacientes e financeiro.">
          {recommendations.length ? (
            <div className="space-y-3">
              {recommendations.map((item, index) => (
                <div className="flex gap-3 rounded-lg border border-border-strong bg-surface-low p-4 text-sm text-ink-secondary" key={item}>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{index + 1}</div>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Operacao estavel" message="Nao ha alertas relevantes nos dados carregados agora." />
          )}
        </SectionCard>
      </div>

      <div className="space-y-5 lg:col-span-4">
        <SectionCard title="Potencial Deby" description="Resumo das oportunidades detectadas.">
          <div className="space-y-3">
            <KpiCard label="Recuperacao prevista" value={brl.format(growthAnalysis.recuperacaoPrevista)} detail={`${growthAnalysis.pacientesEmRisco.length} paciente(s) em risco`} />
            <KpiCard label="Ticket medio" value={brl.format(growthAnalysis.ticketMedio)} detail={`${Math.round(growthAnalysis.taxaRecuperacao * 100)}% taxa de recuperacao`} />
            <KpiCard label="Acoes sugeridas" value={growthAnalysis.insights.length} detail="Geradas a partir de agenda, pacientes e financeiro" />
          </div>
        </SectionCard>

        <SectionCard title="Alertas por tipo">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Retornos" value={growthAnalysis.oportunidades.retornosVencidos} />
            <KpiCard label="Faltas" value={growthAnalysis.oportunidades.faltas} />
            <KpiCard label="Inativos" value={growthAnalysis.oportunidades.inativos} />
            <KpiCard label="Financeiro" value={growthAnalysis.oportunidades.atrasoFinanceiro} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function SecretaryDebyView({ clinicId, clinicName, appointments, patients }: AIPanelProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [improvingId, setImprovingId] = useState<string | null>(null);
  const [improvedMessages, setImprovedMessages] = useState<Record<string, string>>({});

  const upcoming = useMemo(() => appointments
    .filter((item) => isFutureOrToday(item.data) && (item.status === "pendente" || item.status === "confirmado"))
    .sort((a, b) => parseDateTime(a).localeCompare(parseDateTime(b)))
    .slice(0, 8), [appointments]);
  const missed = useMemo(() => appointments.filter((item) => item.status === "faltou").slice(0, 6), [appointments]);
  const recoveryPatients = useMemo(() => patients.filter((patient) => patient.status === "inativo" || patient.status === "retorno_pendente").slice(0, 8), [patients]);

  const candidates: MessageCandidate[] = [
    ...upcoming.map((appointment) => ({
      id: `appointment-${appointment.id}`,
      title: appointment.pacienteNome,
      subtitle: `${appointment.data} as ${appointment.horario} com ${appointment.profissional}`,
      status: appointment.status,
      whatsapp: patientWhatsapp(appointment, patients),
      message: improvedMessages[`appointment-${appointment.id}`] ?? appointmentMessage(appointment, clinicName)
    })),
    ...missed.map((appointment) => ({
      id: `missed-${appointment.id}`,
      title: appointment.pacienteNome,
      subtitle: `Falta em ${appointment.data} as ${appointment.horario}`,
      status: appointment.status,
      whatsapp: patientWhatsapp(appointment, patients),
      message: improvedMessages[`missed-${appointment.id}`] ?? missedMessage(appointment, clinicName)
    })),
    ...recoveryPatients.map((patient) => ({
      id: `patient-${patient.id}`,
      title: patient.nome,
      subtitle: patient.status === "retorno_pendente" ? "Retorno pendente" : "Paciente inativo",
      status: patient.status,
      whatsapp: patient.whatsapp,
      message: improvedMessages[`patient-${patient.id}`] ?? inactivePatientMessage(patient, clinicName)
    }))
  ];

  async function improveMessage(candidate: MessageCandidate) {
    setImprovingId(candidate.id);
    try {
      const output = await askDeby({
        clinicId,
        action: "whatsapp_reply",
        module: "ai_panel_secretaria",
        text: candidate.message,
        metadata: { patient: candidate.title, intent: candidate.subtitle }
      });
      setImprovedMessages((current) => ({ ...current, [candidate.id]: output || candidate.message }));
    } finally {
      setImprovingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Proximos contatos" value={upcoming.length} detail="Pendentes e confirmados" />
        <KpiCard label="Pendentes" value={appointments.filter((item) => item.status === "pendente").length} />
        <KpiCard label="Confirmados" value={appointments.filter((item) => item.status === "confirmado").length} />
        <KpiCard label="Faltas" value={missed.length} />
      </div>

      <SectionCard title="Mensagens prontas para atendimento" description="Copie, abra no WhatsApp ou peca para Deby melhorar o texto.">
        {candidates.length ? (
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <MessageRow
                candidate={candidate}
                copied={copied === candidate.id}
                improving={improvingId === candidate.id}
                key={candidate.id}
                onCopy={() => copyText(candidate.message, () => setCopied(candidate.id))}
                onImprove={() => void improveMessage(candidate)}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="Sem acoes pendentes" message="Nao ha agendamentos ou pacientes exigindo contato neste momento." />
        )}
      </SectionCard>
    </div>
  );
}

function DoctorDebyView({ clinicId, appointments, profileProfessionalId }: AIPanelProps) {
  const [note, setNote] = useState("");
  const [structured, setStructured] = useState("");
  const [isStructuring, setIsStructuring] = useState(false);
  const today = todayISO();
  const dayAppointments = appointments
    .filter((item) => item.data === today)
    .filter((item) => !profileProfessionalId || item.profissionalId === profileProfessionalId || !item.profissionalId)
    .sort((a, b) => a.horario.localeCompare(b.horario));

  async function structureNote() {
    if (!note.trim()) return;
    setIsStructuring(true);
    try {
      const output = await askDeby({
        clinicId,
        action: "clinical_structure",
        module: "ai_panel_profissional",
        text: note,
        metadata: { source: "clinical_free_text" }
      });
      setStructured(output);
    } finally {
      setIsStructuring(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <SectionCard title="Agenda de hoje" description="Atendimentos do profissional no dia atual.">
          {dayAppointments.length ? (
            <div className="space-y-3">
              {dayAppointments.map((appointment) => (
                <div className="rounded-lg border border-border-strong bg-surface-low p-4" key={appointment.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{appointment.horario} - {appointment.pacienteNome}</p>
                      <p className="mt-1 text-sm text-ink-secondary">{appointment.servico}</p>
                    </div>
                    <StatusPill value={appointment.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Sem atendimentos hoje" message="Nao ha consultas na agenda do profissional para hoje." />
          )}
        </SectionCard>
      </div>

      <div className="space-y-5 lg:col-span-7">
        <SectionCard title="Estruturar anotacao clinica" description="Cole texto livre e gere uma versao organizada para revisao profissional.">
          <div className="space-y-4">
            <Field label="Texto livre">
              <textarea
                className={`${inputClass()} min-h-36 resize-y`}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex.: paciente relata dor ha 3 dias, piora ao movimento..."
                value={note}
              />
            </Field>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
              disabled={isStructuring || !note.trim()}
              onClick={() => void structureNote()}
              type="button"
            >
              {isStructuring ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Estruturar com Deby
            </button>
          </div>
        </SectionCard>

        {structured ? (
          <SectionCard title="Resultado estruturado">
            <pre className="whitespace-pre-wrap rounded-lg border border-border-strong bg-surface-low p-4 text-sm leading-relaxed text-ink-secondary">{structured}</pre>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}

export function AIPanel(props: AIPanelProps) {
  const header = {
    admin: { icon: TrendingUp, title: "Deby AI - Gestao", description: "Visao executiva com KPIs reais e prioridades operacionais." },
    secretaria: { icon: CalendarClock, title: "Deby AI - Secretaria", description: "Fila de contatos, confirmacoes e mensagens de recuperacao." },
    profissional: { icon: Stethoscope, title: "Deby AI - Profissional", description: "Agenda do dia e estruturacao clinica assistida." }
  }[props.role];
  const HeaderIcon = header.icon;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[rgba(21,168,152,0.12)] bg-surface p-5 shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-wash text-primary">
            <HeaderIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Assistente operacional</p>
            <h2 className="mt-1 text-lg font-bold text-ink">{header.title}</h2>
            <p className="mt-1 text-sm text-ink-secondary">{header.description}</p>
          </div>
          <Bot className="ml-auto hidden h-5 w-5 text-primary md:block" />
        </div>
      </div>

      {props.role === "admin" ? <AdminDebyView {...props} /> : null}
      {props.role === "secretaria" ? <SecretaryDebyView {...props} /> : null}
      {props.role === "profissional" ? <DoctorDebyView {...props} /> : null}
    </div>
  );
}
