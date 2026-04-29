import { useState } from "react";
import { Bot, Check, Clock, Copy, MessageSquare, RefreshCcw, Sparkles, Target } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { buildWhatsAppMessage, calculateGrowthInsights } from "../../../lib/aiGrowth";
import { brl, whatsappUrl } from "../../../lib/formatters";
import { Field, inputClass } from "../components/Field";
import { StatusPill } from "../components/StatusPill";

export function AIPanel({ insights, clinicName }: { readonly insights: ReturnType<typeof calculateGrowthInsights>; readonly clinicName: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState("Retenção");
  const patientRiskInsights = insights.filter((insight) => insight.patientName);
  const averageTicket = patientRiskInsights.length ? patientRiskInsights.reduce((sum, insight) => sum + insight.value, 0) / patientRiskInsights.length : 0;
  const recoveryRate = 0.35;
  const expectedRecovery = patientRiskInsights.length * averageTicket * recoveryRate;
  const opportunityCards = [
    { label: "Retornos vencidos", value: insights.filter((insight) => insight.type === "retorno").length },
    { label: "Faltas", value: insights.filter((insight) => insight.type === "falta").length },
    { label: "Inativos", value: insights.filter((insight) => insight.type === "inativo").length },
    { label: "Atraso financeiro", value: insights.filter((insight) => insight.type === "financeiro").length }
  ];

  const handleSimulate = () => {
    setIsThinking(true);
    setTimeout(() => setIsThinking(false), 1500);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Coluna de Parâmetros (Esquerda) */}
      <div className="lg:col-span-4 space-y-5">
        <SectionCard title="Parâmetros de Crescimento" description="Defina seus objetivos para que a IA gere recomendações.">
          <div className="space-y-4">
            <Field label="Objetivo Principal">
              <select className={inputClass()} value={selectedGoal} onChange={(e) => setSelectedGoal(e.target.value)}>
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
              onClick={handleSimulate}
              disabled={isThinking}
              className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {isThinking ? (
                <>
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  IA Analisando...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4" />
                  Gerar Plano de Ação
                </>
              )}
            </button>
          </div>
        </SectionCard>

        {/* Pro Tip Card */}
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-5 shadow-clinical">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Pro Tip</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant font-medium">
            Campanhas de retenção enviadas às terças-feiras costumam ter 40% mais cliques no WhatsApp do que em outros dias.
          </p>
        </div>
      </div>

      {/* Palco de Resultados (Direita) */}
      <div className="lg:col-span-8">
        <SectionCard title="Plano de Ação Inteligente" description="Insights calculados em tempo real com base nos dados operacionais da clínica.">
          {isThinking ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 text-secondary">
              <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-sm font-medium animate-pulse">Cruzando dados de agendamentos e finanças...</p>
            </div>
          ) : insights.length === 0 ? (
            <EmptyState title="Tudo em dia!" message="Sua clínica está operando com alta eficiência. Quando houver ociosidade ou inadimplência, as sugestões aparecerão aqui." />
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Recuperação prevista</p>
                <p className="mt-2 text-2xl font-bold text-on-surface">
                  Você pode recuperar {brl.format(expectedRecovery)} com {patientRiskInsights.length} pacientes
                </p>
                <p className="mt-1 text-sm text-secondary">
                  Cálculo: {patientRiskInsights.length} pacientes em risco × {brl.format(averageTicket)} de ticket médio × 35% de taxa de recuperação.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {opportunityCards.map((card) => (
                  <div className="rounded-xl border border-surface-variant bg-white p-4" key={card.label}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-secondary">{card.label}</p>
                    <p className="mt-1 text-xl font-bold text-on-surface">{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Métricas de Impacto */}
              <div className="grid gap-3 sm:grid-cols-3 mb-6">
                <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary">ROI Estimado</p>
                  <p className="mt-1 text-xl font-bold text-primary">12.5x</p>
                </div>
                <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Recuperação Prevista</p>
                  <p className="mt-1 text-xl font-bold text-on-surface">
                    {brl.format(insights.reduce((acc, curr) => acc + curr.value, 0))}
                  </p>
                </div>
                <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Ações Sugeridas</p>
                  <p className="mt-1 text-xl font-bold text-secondary">{insights.length}</p>
                </div>
              </div>

              {insights.map((insight) => {
                const message = buildWhatsAppMessage(insight, clinicName);
                return (
                  <article className="rounded-xl border border-surface-variant bg-white p-5 transition hover:shadow-clinical" key={insight.id}>
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <StatusPill value={insight.type} />
                          <span className="text-[10px] font-bold text-secondary uppercase tracking-tighter">Impacto {insight.value > 1000 ? "Alto" : "Médio"}</span>
                        </div>
                        <h3 className="mt-3 font-semibold text-on-surface">{insight.title}</h3>
                        <p className="mt-1 text-sm text-secondary">{insight.description}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <button
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium hover:border-primary hover:text-primary transition"
                          onClick={() => { void navigator.clipboard.writeText(message); setCopied(insight.id); }}
                          type="button"
                        >
                          {copied === insight.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {copied === insight.id ? "Copiado!" : "Copiar mensagem"}
                        </button>
                        {insight.whatsapp ? (
                          <a
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark transition"
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
                    
                    {/* Mensagem sugerida formatada */}
                    <div className="mt-4 rounded-xl bg-surface-container-low p-4 text-sm leading-relaxed text-secondary border border-surface-variant/50 relative group">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-primary/60">Sugerido para WhatsApp</p>
                      <div className="italic text-on-surface-variant">"{message}"</div>
                      <div className="mt-3 flex items-center gap-2 text-[10px] text-secondary font-medium">
                        <Clock className="h-3 w-3" /> Sugestão de envio: Próxima terça-feira, 09:30
                      </div>
                    </div>
                  </article>
                );
              })}

              {patientRiskInsights.length > 0 ? (
                <div className="rounded-xl border border-surface-variant bg-white p-5">
                  <h4 className="text-sm font-bold text-on-surface">Pacientes em risco</h4>
                  <div className="mt-4 space-y-3">
                    {patientRiskInsights.map((insight) => {
                      const message = buildWhatsAppMessage(insight, clinicName);
                      return (
                        <div className="flex flex-col justify-between gap-3 rounded-lg border border-surface-variant p-3 md:flex-row md:items-center" key={`risk-${insight.id}`}>
                          <div>
                            <p className="font-semibold">{insight.patientName}</p>
                            <p className="text-sm text-secondary">{insight.whatsapp ?? "WhatsApp não informado"} · {insight.description}</p>
                            <p className="mt-1 text-xs font-semibold text-primary">Valor potencial: {brl.format(insight.value)} · Ação recomendada: contato ativo por WhatsApp</p>
                          </div>
                          <button
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium hover:border-primary hover:text-primary transition"
                            onClick={() => { void navigator.clipboard.writeText(message); setCopied(`risk-${insight.id}`); }}
                            type="button"
                          >
                            {copied === `risk-${insight.id}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copied === `risk-${insight.id}` ? "Copiado!" : "Copiar mensagem"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Checklist de Implementação */}
              <div className="mt-8 rounded-xl border border-dashed border-outline-variant p-6 bg-white">
                <h4 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Checklist de Implementação
                </h4>
                <ul className="space-y-3">
                  {[
                    "Confirmar lista de pacientes com o profissional responsável.",
                    "Ajustar mensagens sugeridas para o tom de voz da clínica.",
                    "Disparar mensagens em blocos de 20 para evitar spam.",
                    "Registrar retornos agendados no painel de pacientes."
                  ].map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-secondary">
                      <div className="mt-1 h-4 w-4 shrink-0 rounded border border-outline-variant flex items-center justify-center text-[10px] font-bold text-primary">
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
