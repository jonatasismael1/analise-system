import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Edit2, MessageCircle, RefreshCcw, X } from "lucide-react";
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

const origemLabel: Record<string, string> = {
  manual: "Manual", whatsapp: "WhatsApp", site: "Site", indicacao: "Indicação", outros: "Outros"
};

function LeadModal({
  lead,
  stages,
  onClose,
  onSave,
  onMove,
  clinicId
}: {
  readonly lead: Lead;
  readonly stages: LeadStage[];
  readonly onClose: () => void;
  readonly onSave: (updated: Lead) => Promise<void>;
  readonly onMove: (lead: Lead, stageId: string) => Promise<void>;
  readonly clinicId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(lead);
  const [saving, setSaving] = useState(false);
  const [debyOutput, setDebyOutput] = useState("");
  const currentStage = stages.find((s) => s.id === lead.etapaId);

  async function handleSave() {
    setSaving(true);
    try { await onSave(form); setEditing(false); } finally { setSaving(false); }
  }

  async function analyzeLead() {
    const output = await askDeby({
      clinicId, action: "lead_analysis", module: "leads",
      text: [`Nome: ${lead.nome}`, `Telefone: ${lead.telefone ?? "-"}`, `Interesse: ${lead.interesse ?? "-"}`, `Temperatura: ${lead.temperatura}`, `Resumo: ${lead.resumo ?? "-"}`, `Objeções: ${lead.objecoes ?? "-"}`].join("\n")
    });
    setDebyOutput(output);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-xl rounded-xl border border-surface-variant bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-surface-variant px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Lead</p>
            <h2 className="text-lg font-bold text-ink">{lead.nome}</h2>
          </div>
          <button className="rounded-md p-1.5 text-secondary hover:bg-surface-low" type="button" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Badges de estado */}
          <div className="flex flex-wrap items-center gap-2">
            {currentStage && (
              <span className="rounded-full border border-primary/30 bg-primary-wash px-3 py-1 text-[11px] font-semibold text-primary">
                {currentStage.nome}
              </span>
            )}
            <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${toneByTemperature[lead.temperatura]}`}>
              {lead.temperatura}
            </span>
            <span className="rounded-full border border-surface-variant bg-surface-low px-3 py-1 text-[11px] text-secondary">
              {origemLabel[lead.origem] ?? lead.origem}
            </span>
          </div>

          {!editing ? (
            /* Modo visualização */
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Telefone/WhatsApp" value={lead.telefone ?? "Não informado"} />
                <InfoRow label="E-mail" value={lead.email ?? "Não informado"} />
                <InfoRow label="Interesse" value={lead.interesse ?? "Não informado"} />
                <InfoRow label="Origem" value={origemLabel[lead.origem] ?? lead.origem} />
              </div>
              {lead.resumo && <InfoBlock label="Resumo" value={lead.resumo} />}
              {lead.objecoes && <InfoBlock label="Objeções" value={lead.objecoes} />}
              {lead.proximoPasso && <InfoBlock label="Próximo passo" value={lead.proximoPasso} />}
            </div>
          ) : (
            /* Modo edição */
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome"><input className={inputClass()} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
                <Field label="Telefone"><input className={inputClass()} value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value || null })} /></Field>
                <Field label="E-mail"><input className={inputClass()} value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value || null })} /></Field>
                <Field label="Interesse"><input className={inputClass()} value={form.interesse ?? ""} onChange={(e) => setForm({ ...form, interesse: e.target.value || null })} /></Field>
                <Field label="Temperatura">
                  <select className={inputClass()} value={form.temperatura} onChange={(e) => setForm({ ...form, temperatura: e.target.value as Lead["temperatura"] })}>
                    <option value="frio">Frio</option>
                    <option value="morno">Morno</option>
                    <option value="quente">Quente</option>
                  </select>
                </Field>
                <Field label="Etapa">
                  <select className={inputClass()} value={form.etapaId ?? ""} onChange={(e) => setForm({ ...form, etapaId: e.target.value || null })}>
                    <option value="">Sem etapa</option>
                    {stages.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Resumo"><textarea className={inputClass()} rows={2} value={form.resumo ?? ""} onChange={(e) => setForm({ ...form, resumo: e.target.value || null })} /></Field>
              <Field label="Objeções"><textarea className={inputClass()} rows={2} value={form.objecoes ?? ""} onChange={(e) => setForm({ ...form, objecoes: e.target.value || null })} /></Field>
              <Field label="Próximo passo"><textarea className={inputClass()} rows={2} value={form.proximoPasso ?? ""} onChange={(e) => setForm({ ...form, proximoPasso: e.target.value || null })} /></Field>
            </div>
          )}

          {/* Mover etapa (quando não editando) */}
          {!editing && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">Mover para etapa</p>
              <select className={inputClass()} value={lead.etapaId ?? ""} onChange={(e) => void onMove(lead, e.target.value)}>
                <option value="">Sem etapa</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          )}

          {/* Análise Deby */}
          {!editing && (
            <div>
              <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium hover:border-primary hover:text-primary" type="button" onClick={() => void analyzeLead()}>
                <Bot className="h-4 w-4" />
                Analisar com Deby AI
              </button>
              {debyOutput && (
                <div className="mt-3 whitespace-pre-wrap rounded-lg border border-teal-100 bg-teal-50 p-3 text-[12px] text-teal-900">{debyOutput}</div>
              )}
            </div>
          )}

          {/* WhatsApp */}
          {!editing && lead.telefone && (
            <a
              href={`https://wa.me/${lead.telefone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              <MessageCircle className="h-4 w-4" />
              Abrir no WhatsApp
            </a>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-surface-variant px-5 py-3">
          <p className="text-[11px] text-secondary">Lead criado no sistema</p>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium hover:border-error hover:text-error" type="button" onClick={() => { setForm(lead); setEditing(false); }}>Cancelar</button>
                <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60" type="button" disabled={saving} onClick={() => void handleSave()}>{saving ? "Salvando..." : "Salvar"}</button>
              </>
            ) : (
              <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium hover:border-primary hover:text-primary" type="button" onClick={() => setEditing(true)}>
                <Edit2 className="h-3.5 w-3.5" />
                Editar lead
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg border border-surface-variant bg-surface-low p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

export function LeadKanbanPanel({ clinicId }: { readonly clinicId: string }) {
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ nome: "", telefone: "", interesse: "" });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

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

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => leads.filter((lead) =>
    `${lead.nome} ${lead.telefone ?? ""} ${lead.interesse ?? ""}`.toLowerCase().includes(filter.toLowerCase())
  ), [filter, leads]);

  const fallbackStageId = stages[0]?.id ?? null;

  async function handleCreateLead() {
    if (!form.nome.trim()) return;
    await saveLead(clinicId, { nome: form.nome.trim(), telefone: form.telefone.trim() || null, interesse: form.interesse.trim() || null, etapaId: fallbackStageId, origem: "manual" });
    setForm({ nome: "", telefone: "", interesse: "" });
    await load();
  }

  async function handleMove(lead: Lead, stageId: string) {
    if (!stageId || lead.etapaId === stageId) return;
    await moveLead(clinicId, lead, stageId);
    await load();
    // Atualiza lead selecionado se estiver aberto
    if (selectedLead?.id === lead.id) {
      setSelectedLead((prev) => prev ? { ...prev, etapaId: stageId } : null);
    }
  }

  async function handleSaveLead(updated: Lead) {
    await saveLead(clinicId, { ...updated, id: updated.id });
    await load();
    setSelectedLead(null);
  }

  return (
    <div className="space-y-5">
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          stages={stages}
          clinicId={clinicId}
          onClose={() => setSelectedLead(null)}
          onSave={handleSaveLead}
          onMove={handleMove}
        />
      )}

      <SectionCard title="Novo lead" description="Cadastro rápido para contatos comerciais fora do WhatsApp.">
        <form className="grid gap-3 md:grid-cols-[1fr_180px_1fr_auto]" onSubmit={(e) => { e.preventDefault(); void handleCreateLead(); }}>
          <Field label="Nome"><input className={inputClass()} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></Field>
          <Field label="Telefone"><input className={inputClass()} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></Field>
          <Field label="Interesse"><input className={inputClass()} value={form.interesse} onChange={(e) => setForm({ ...form, interesse: e.target.value })} placeholder="Procedimento ou demanda" /></Field>
          <button className="mt-5 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark" type="submit">Criar lead</button>
        </form>
      </SectionCard>

      <SectionCard title="Kanban comercial" description="Clique em um card para ver detalhes. Arraste para mover entre etapas.">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <Field label="Buscar"><input className={inputClass()} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Nome, telefone ou interesse" /></Field>
          <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 text-sm font-medium hover:border-primary hover:text-primary" type="button" onClick={() => void load()}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
        {message && <p className="mb-3 rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 text-sm text-secondary">{message}</p>}
        {stages.length === 0 ? (
          <EmptyState title="Sem etapas" message="As etapas padrão serão criadas ao atualizar o funil." />
        ) : (
          <div className="-mx-1 overflow-x-auto pb-3">
            <div className="flex gap-3 px-1" style={{ minWidth: `${stages.length * 292}px` }}>
              {stages.map((stage) => {
                const items = filtered.filter((lead) => (lead.etapaId ?? fallbackStageId) === stage.id);
                return (
                  <section
                    className="flex w-[280px] shrink-0 flex-col rounded-lg border border-surface-variant border-t-4 bg-surface-container-low"
                    key={stage.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
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
                      {items.length === 0 && (
                        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-outline-variant bg-white/60 text-[11px] font-medium text-secondary">Solte leads aqui</div>
                      )}
                      {items.map((lead) => (
                        <article
                          className="cursor-pointer rounded-lg border border-outline-variant bg-white p-3 shadow-clinical transition hover:border-primary hover:shadow-md"
                          draggable
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          onDragStart={() => setDraggedLeadId(lead.id)}
                          onDragEnd={() => setDraggedLeadId(null)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-on-surface">{lead.nome}</p>
                              <p className="mt-0.5 text-xs text-secondary">{lead.telefone ?? "Sem telefone"}</p>
                            </div>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${toneByTemperature[lead.temperatura]}`}>{lead.temperatura}</span>
                          </div>
                          <p className="mt-2 text-xs text-secondary">{lead.interesse ?? "Interesse não informado"}</p>
                          {lead.resumo && (
                            <p className="mt-2 rounded-md bg-surface-container-low px-2 py-1.5 text-[11px] text-on-surface-variant line-clamp-2">{lead.resumo}</p>
                          )}
                          <p className="mt-2 text-[10px] font-medium text-primary">Clique para ver detalhes →</p>
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
