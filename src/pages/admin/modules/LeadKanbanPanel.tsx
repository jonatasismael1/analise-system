import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, RefreshCcw } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { askDeby } from "../../../services/debyService";
import { ensureDefaultStages, loadLeads, loadLeadStages, moveLead, saveLead, type Lead, type LeadStage } from "../../../services/leadService";
import { Field, inputClass } from "../components/Field";

const toneByTemperature: Record<Lead["temperatura"], string> = {
  frio: "border-slate-200 bg-slate-50 text-slate-700",
  morno: "border-amber-200 bg-amber-50 text-amber-700",
  quente: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

export function LeadKanbanPanel({ clinicId }: { readonly clinicId: string }) {
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [debyByLead, setDebyByLead] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ nome: "", telefone: "", interesse: "" });

  const load = useCallback(async () => {
    setMessage(null);
    try {
      await ensureDefaultStages(clinicId);
      const [nextStages, nextLeads] = await Promise.all([loadLeadStages(clinicId), loadLeads(clinicId)]);
      setStages(nextStages);
      setLeads(nextLeads);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar leads.");
    }
  }, [clinicId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => leads.filter((lead) => `${lead.nome} ${lead.telefone ?? ""} ${lead.interesse ?? ""}`.toLowerCase().includes(filter.toLowerCase())), [filter, leads]);
  const fallbackStageId = stages[0]?.id ?? null;

  async function handleCreateLead() {
    if (!form.nome.trim()) return;
    await saveLead(clinicId, {
      nome: form.nome.trim(),
      telefone: form.telefone.trim() || null,
      interesse: form.interesse.trim() || null,
      etapaId: fallbackStageId,
      origem: "manual"
    });
    setForm({ nome: "", telefone: "", interesse: "" });
    await load();
  }

  async function handleMove(lead: Lead, stageId: string) {
    await moveLead(clinicId, lead, stageId);
    await load();
  }

  async function analyzeLead(lead: Lead) {
    const output = await askDeby({
      clinicId,
      action: "lead_analysis",
      module: "leads",
      text: [
        `Nome: ${lead.nome}`,
        `Telefone: ${lead.telefone ?? "-"}`,
        `Interesse: ${lead.interesse ?? "-"}`,
        `Temperatura atual: ${lead.temperatura}`,
        `Resumo: ${lead.resumo ?? "-"}`,
        `Objecoes: ${lead.objecoes ?? "-"}`
      ].join("\n")
    });
    setDebyByLead((current) => ({ ...current, [lead.id]: output }));
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Novo lead" description="Cadastro rápido para contatos comerciais fora do WhatsApp.">
        <form className="grid gap-3 md:grid-cols-[1fr_180px_1fr_auto]" onSubmit={(event) => { event.preventDefault(); void handleCreateLead(); }}>
          <Field label="Nome"><input className={inputClass()} value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} required /></Field>
          <Field label="Telefone"><input className={inputClass()} value={form.telefone} onChange={(event) => setForm({ ...form, telefone: event.target.value })} /></Field>
          <Field label="Interesse"><input className={inputClass()} value={form.interesse} onChange={(event) => setForm({ ...form, interesse: event.target.value })} placeholder="Procedimento ou demanda" /></Field>
          <button className="mt-5 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark" type="submit">Criar lead</button>
        </form>
      </SectionCard>

      <SectionCard title="Kanban comercial" description="Funil de leads com histórico preservado e apoio da Deby AI.">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <Field label="Buscar"><input className={inputClass()} value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Nome, telefone ou interesse" /></Field>
          <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 text-sm font-medium hover:border-primary hover:text-primary" type="button" onClick={() => void load()}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
        {message ? <p className="mb-3 rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 text-sm text-secondary">{message}</p> : null}
        {stages.length === 0 ? <EmptyState title="Sem etapas" message="As etapas padrão serão criadas ao atualizar o funil." /> : (
          <div className="-mx-1 overflow-x-auto pb-3">
            <div className="flex gap-3 px-1" style={{ minWidth: `${stages.length * 292}px` }}>
              {stages.map((stage) => {
                const items = filtered.filter((lead) => (lead.etapaId ?? fallbackStageId) === stage.id);
                return (
                  <section
                    className="flex w-[280px] shrink-0 flex-col rounded-lg border border-surface-variant border-t-4 bg-surface-container-low"
                    key={stage.id}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const lead = leads.find((item) => item.id === draggedLeadId);
                      setDraggedLeadId(null);
                      if (lead && lead.etapaId !== stage.id) void handleMove(lead, stage.id);
                    }}
                  >
                    <div className="border-b border-surface-variant px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-on-surface">{stage.nome}</h3>
                        <span className="rounded-full border border-surface-variant bg-white px-2 py-0.5 text-xs font-semibold text-secondary">{items.length}</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 560 }}>
                      {items.length === 0 ? <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-outline-variant bg-white/60 text-[11px] font-medium text-secondary">Solte leads aqui</div> : null}
                      {items.map((lead) => (
                        <article className="rounded-lg border border-outline-variant bg-white p-3 shadow-clinical" draggable key={lead.id} onDragStart={() => setDraggedLeadId(lead.id)} onDragEnd={() => setDraggedLeadId(null)}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-on-surface">{lead.nome}</p>
                              <p className="mt-0.5 text-xs text-secondary">{lead.telefone ?? "Sem telefone"}</p>
                            </div>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${toneByTemperature[lead.temperatura]}`}>{lead.temperatura}</span>
                          </div>
                          <p className="mt-2 text-xs text-secondary">{lead.interesse ?? "Interesse não informado"}</p>
                          {lead.resumo ? <p className="mt-2 rounded-md bg-surface-container-low px-2 py-1.5 text-[11px] text-on-surface-variant">{lead.resumo}</p> : null}
                          <div className="mt-3 grid gap-2">
                            <select className="rounded-md border border-outline-variant px-2 py-1.5 text-[11px]" value={lead.etapaId ?? fallbackStageId ?? ""} onChange={(event) => void handleMove(lead, event.target.value)}>
                              {stages.map((item) => <option key={item.id} value={item.id}>Mover para: {item.nome}</option>)}
                            </select>
                            <button className="inline-flex items-center justify-center gap-1.5 rounded-md border border-outline-variant px-2 py-1.5 text-[11px] font-medium hover:border-primary hover:text-primary" type="button" onClick={() => void analyzeLead(lead)}>
                              <Bot className="h-3.5 w-3.5" />
                              Analisar lead
                            </button>
                          </div>
                          {debyByLead[lead.id] ? <div className="mt-2 whitespace-pre-wrap rounded-md border border-teal-100 bg-teal-50 px-2 py-1.5 text-[11px] text-teal-900">{debyByLead[lead.id]}</div> : null}
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

