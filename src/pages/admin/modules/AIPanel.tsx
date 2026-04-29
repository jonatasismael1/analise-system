import { useState } from "react";
import { Bot, Check, Clock, Copy, MessageSquare, RefreshCcw, Sparkles, Target } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { buildWhatsAppMessage, type GrowthAnalysis } from "../../../lib/aiGrowth";
import { brl, whatsappUrl } from "../../../lib/formatters";
import { Field, inputClass } from "../components/Field";
import { StatusPill } from "../components/StatusPill";

export function AIPanel({ analysis, clinicName }: { readonly analysis: GrowthAnalysis; readonly clinicName: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState("Retenção");
  const { insights, pacientesEmRisco, oportunidades, recuperacaoPrevista, taxaRecuperacao, ticketMedio } = analysis;

  const handleSimulate = () => {
    setIsThinking(true);
    setTimeout(() => setIsThinking(false), 1500);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-5 lg:col-span-4">
        <SectionCard title="Parâmetros de Crescimento" description="Defina seus objetivos para que a IA gere recomendações.">
          <div className="space-y-4">
            <Field label="Objetivo Principal">
              <select className={inputClass()} value={selectedGoal} onChange={(event) => setSelectedGoal(event.target.value)}>
                <option>Retenção de Pacientes</option>
                <option>Aumento de Ticket Médio</option>
                <option>Recuperação de Faltas</option>
                <option>Atração de Novos Leads</option>
              </select>
            </Field>
            <Field label="Público-alvo">
              <select className={inputClass()}>
                <option>Todos os Pacientes</option>
                <option>Pacientes Inativos (+6 meses)</option>
                <option>Pacientes com Retorno Pendente</option>
                <option>Leads de Redes Sociais</option>
              </select>
            </Field>
            <Field label="Orçamento Estimado">
              <input className={inputClass()} type="number" placeholder="R$ 0,00" />
            </Field>
            <button
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-all hover:bg-primary-dark disabled:opacity-50"
              disabled={isThinking}
              onClick={handleSimulate}
              type="button"
            >
              {isThinking ? (
                <>
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  IA analisando...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4" />
                  Gerar plano de ação
                </>
              )}
            </button>
          </div>
        </SectionCard>

        <div className="rounded-xl border border-primary/10 bg-primary/5 p-5 shadow-clinical">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Pro Tip</span>
          </div>
          <p className="mt-3 text-sm font-medium leading-relaxed text-on-surface-variant">
            Campanhas de retenção enviadas às terças-feiras costumam ter mais resposta no WhatsApp do que mensagens sem segmentação.
          </p>
        </div>
      </div>

      <div className="lg:col-span-8">
        <SectionCard title="Plano de Ação Inteligente" description="Insights calculados em tempo real com base nos dados operacionais da clínica.">
          {isThinking ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 text-secondary">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              <p className="animate-pulse text-sm font-medium">Cruzando dados de agendamentos e finanças...</p>
            </div>
          ) : insights.length === 0 ? (
            <EmptyState title="Tudo em dia!" message="Sua clínica está operando com alta eficiência. Quando houver ociosidade ou inadimplência, as sugestões aparecerão aqui." />
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Recuperação prevista</p>
                <p className="mt-2 text-2xl font-bold text-on-surface">
                  Você pode recuperar {brl.format(recuperacaoPrevista)} com {pacientesEmRisco.length} pacientes
                </p>
                <p className="mt-1 text-sm text-secondary">
                  Fórmula: {pacientesEmRisco.length} pacientes em risco × {brl.format(ticketMedio)} de ticket médio × {Math.round(taxaRecuperacao * 100)}% de taxa de recuperação.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Retornos vencidos", value: oportunidades.retornosVencidos },
                  { label: "Faltas", value: oportunidades.faltas },
                  { label: "Inativos", value: oportunidades.inativos },
                  { label: "Atraso financeiro", value: oportunidades.atrasoFinanceiro }
                ].map((card) => (
                  <div className="rounded-xl border border-surface-variant bg-white p-4" key={card.label}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-secondary">{card.label}</p>
                    <p className="mt-1 text-xl font-bold text-on-surface">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Ticket médio</p>
                  <p className="mt-1 text-xl font-bold text-on-surface">{brl.format(ticketMedio)}</p>
                </div>
                <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Ações sugeridas</p>
                  <p className="mt-1 text-xl font-bold text-secondary">{insights.length}</p>
                </div>
              </div>

              {pacientesEmRisco.length > 0 ? (
                <div className="rounded-xl border border-surface-variant bg-white p-5">
                  <h4 className="text-sm font-bold text-on-surface">Pacientes para recuperar</h4>
                  <div className="mt-4 space-y-3">
                    {pacientesEmRisco.map((patient) => {
                      const message = buildWhatsAppMessage(patient.insight, clinicName);
                      return (
                        <div className="flex flex-col justify-between gap-3 rounded-lg border border-surface-variant p-3 md:flex-row md:items-center" key={patient.id}>
                          <div>
                            <p className="font-semibold">{patient.nome}</p>
                            <p className="text-sm text-secondary">{patient.whatsapp ?? "WhatsApp não informado"} · {patient.motivo}</p>
                            <p className="mt-1 text-xs font-semibold text-primary">
                              Valor potencial: {brl.format(patient.valorPotencial)} · Ação recomendada: {patient.acaoRecomendada}
                            </p>
                          </div>
                          <button
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
                            onClick={() => { void navigator.clipboard.writeText(message); setCopied(`risk-${patient.id}`); }}
                            type="button"
                          >
                            {copied === `risk-${patient.id}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copied === `risk-${patient.id}` ? "Copiado!" : "Copiar mensagem"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {insights.map((insight) => {
                const message = buildWhatsAppMessage(insight, clinicName);
                return (
                  <article className="rounded-xl border border-surface-variant bg-white p-5 transition hover:shadow-clinical" key={insight.id}>
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <StatusPill value={insight.type} />
                          <span className="text-[10px] font-bold uppercase tracking-tighter text-secondary">Impacto {insight.value > 1000 ? "Alto" : "Médio"}</span>
                        </div>
                        <h3 className="mt-3 font-semibold text-on-surface">{insight.title}</h3>
                        <p className="mt-1 text-sm text-secondary">{insight.description}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <button
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
                          onClick={() => { void navigator.clipboard.writeText(message); setCopied(insight.id); }}
                          type="button"
                        >
                          {copied === insight.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {copied === insight.id ? "Copiado!" : "Copiar mensagem"}
                        </button>
                        {insight.whatsapp ? (
                          <a
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
                            href={whatsappUrl(insight.whatsapp, message)}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="relative mt-4 rounded-xl border border-surface-variant/50 bg-surface-container-low p-4 text-sm leading-relaxed text-secondary">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-primary/60">Sugerido para WhatsApp</p>
                      <div className="italic text-on-surface-variant">"{message}"</div>
                      <div className="mt-3 flex items-center gap-2 text-[10px] font-medium text-secondary">
                        <Clock className="h-3 w-3" /> Sugestão de envio: próxima terça-feira, 09:30
                      </div>
                    </div>
                  </article>
                );
              })}

              <div className="mt-8 rounded-xl border border-dashed border-outline-variant bg-white p-6">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-on-surface">
                  <Target className="h-4 w-4 text-primary" />
                  Checklist de implementação
                </h4>
                <ul className="space-y-3">
                  {[
                    "Confirmar lista de pacientes com o profissional responsável.",
                    "Ajustar mensagens sugeridas para o tom de voz da clínica.",
                    "Disparar mensagens em blocos pequenos para evitar spam.",
                    "Registrar retornos agendados no painel de pacientes."
                  ].map((step, idx) => (
                    <li className="flex items-start gap-3 text-sm text-secondary" key={step}>
                      <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-outline-variant text-[10px] font-bold text-primary">
                        {idx + 1}
                      </div>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
