import { useState } from "react";
import { ChevronDown, ChevronUp, Package, Plus, Trash2, X } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { brl } from "../../../lib/formatters";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
import type { Service } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";

export interface ProgramaItem {
  id?: string;
  servicoId: string | null;
  nomeServico: string;
  descricao: string;
  precoIndividual: number;
  ordem: number;
}

export interface ProgramaDesconto {
  id: string;
  clinicaId: string;
  nome: string;
  descricao: string;
  valorTotal: number;
  valorComDesconto: number;
  ativo: boolean;
  itens: ProgramaItem[];
}

export type ProgramaForm = {
  id?: string;
  nome: string;
  descricao: string;
  valorComDesconto: number;
  ativo: boolean;
  itens: ProgramaItem[];
};

function emptyForm(): ProgramaForm {
  return { nome: "", descricao: "", valorComDesconto: 0, ativo: true, itens: [] };
}

function ProgramaCard({
  programa,
  onEdit,
  onDelete
}: {
  readonly programa: ProgramaDesconto;
  readonly onEdit: (p: ProgramaDesconto) => void;
  readonly onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const economia = programa.valorTotal - programa.valorComDesconto;
  const pct = programa.valorTotal > 0 ? Math.round((economia / programa.valorTotal) * 100) : 0;

  return (
    <article className="rounded-xl border border-surface-variant bg-white transition hover:shadow-clinical">
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-ink">{programa.nome}</p>
            {!programa.ativo && (
              <span className="rounded-full bg-surface-low px-2 py-0.5 text-[10px] font-bold uppercase text-secondary">Inativo</span>
            )}
            {economia > 0 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{pct}% de desconto</span>
            )}
          </div>
          {programa.descricao && <p className="mt-0.5 text-sm text-secondary">{programa.descricao}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-secondary">Valor individual: </span>
              <span className="font-semibold text-ink line-through opacity-60">{brl.format(programa.valorTotal)}</span>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-secondary">Com desconto: </span>
              <span className="text-lg font-bold text-primary">{brl.format(programa.valorComDesconto)}</span>
            </div>
            {economia > 0 && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-secondary">Economia: </span>
                <span className="font-bold text-emerald-600">{brl.format(economia)}</span>
              </div>
            )}
          </div>
          <p className="mt-1.5 text-xs text-secondary">{programa.itens.length} serviço{programa.itens.length !== 1 ? "s" : ""} incluído{programa.itens.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary transition"
            type="button"
            onClick={() => onEdit(programa)}
          >
            Editar
          </button>
          <button
            aria-label="Excluir programa"
            className="rounded-lg p-1.5 text-secondary hover:bg-red-50 hover:text-error transition"
            type="button"
            onClick={() => void confirmDangerAction(`Tem certeza que deseja excluir o programa "${programa.nome}"?`).then((ok) => { if (ok) onDelete(programa.id); })}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-1.5 text-secondary hover:bg-surface-low transition"
            type="button"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && programa.itens.length > 0 && (
        <div className="border-t border-surface-variant px-4 pb-4 pt-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-secondary">Serviços do programa</p>
          <div className="space-y-2">
            {programa.itens.map((item) => (
              <div className="flex items-center justify-between rounded-lg bg-surface-low px-3 py-2" key={item.id ?? item.nomeServico}>
                <div>
                  <p className="text-sm font-medium text-ink">{item.nomeServico}</p>
                  {item.descricao && <p className="text-xs text-secondary">{item.descricao}</p>}
                </div>
                <span className="font-semibold text-ink">{brl.format(item.precoIndividual)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export function DiscountProgramsPanel({
  programas,
  services,
  onSave,
  onDelete
}: {
  readonly programas: ProgramaDesconto[];
  readonly services: Service[];
  readonly onSave: (form: ProgramaForm) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProgramaForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterAtivo, setFilterAtivo] = useState<"todos" | "ativo" | "inativo">("ativo");

  const valorTotal = form.itens.reduce((s, i) => s + i.precoIndividual, 0);

  function openCreate() {
    setForm(emptyForm());
    setError(null);
    setShowForm(true);
  }

  function openEdit(p: ProgramaDesconto) {
    setForm({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      valorComDesconto: p.valorComDesconto,
      ativo: p.ativo,
      itens: p.itens.map((i) => ({ ...i }))
    });
    setError(null);
    setShowForm(true);
  }

  function addItem() {
    const nextOrdem = form.itens.length;
    setForm({ ...form, itens: [...form.itens, { servicoId: services[0]?.id ?? null, nomeServico: services[0]?.nome ?? "", descricao: "", precoIndividual: services[0]?.preco ?? 0, ordem: nextOrdem }] });
  }

  function removeItem(idx: number) {
    setForm({ ...form, itens: form.itens.filter((_, i) => i !== idx) });
  }

  function updateItem(idx: number, patch: Partial<ProgramaItem>) {
    setForm({ ...form, itens: form.itens.map((item, i) => i === idx ? { ...item, ...patch } : item) });
  }

  function selectService(idx: number, servicoId: string) {
    const svc = services.find((s) => s.id === servicoId);
    updateItem(idx, { servicoId, nomeServico: svc?.nome ?? "", precoIndividual: svc?.preco ?? 0 });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.nome.trim()) { setError("Informe o nome do programa."); return; }
    if (form.itens.length === 0) { setError("Adicione pelo menos um serviço ao programa."); return; }
    setSaving(true);
    try {
      await onSave({ ...form, nome: form.nome.trim() });
      setShowForm(false);
      setForm(emptyForm());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar programa.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = programas.filter((p) =>
    filterAtivo === "todos" ? true : filterAtivo === "ativo" ? p.ativo : !p.ativo
  );

  return (
    <div className="space-y-5">
      {/* Header com ação */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-secondary">Crie programas comerciais com múltiplos serviços e valores com desconto para facilitar orçamentos.</p>
        </div>
        <button
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition"
          type="button"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" />
          Novo programa
        </button>
      </div>

      {/* Filtro */}
      <div className="flex gap-2">
        {(["todos", "ativo", "inativo"] as const).map((f) => (
          <button
            key={f}
            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition ${filterAtivo === f ? "border-primary bg-primary text-white" : "border-outline-variant text-secondary hover:border-primary hover:text-primary"}`}
            type="button"
            onClick={() => setFilterAtivo(f)}
          >
            {f === "todos" ? "Todos" : f === "ativo" ? "Ativos" : "Inativos"}
          </button>
        ))}
      </div>

      {/* Modal de criação/edição */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-xl border border-surface-variant bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-surface-variant px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Programas de Descontos</p>
                <h2 className="text-lg font-bold text-ink">{form.id ? "Editar programa" : "Novo programa"}</h2>
              </div>
              <button className="rounded-md p-1.5 text-secondary hover:bg-surface-low" type="button" onClick={() => setShowForm(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="space-y-4 p-5" onSubmit={(e) => { void handleSubmit(e); }}>
              {error && <div className="rounded-lg border border-error/30 bg-red-50 px-4 py-2.5 text-sm text-error">{error}</div>}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome do programa *">
                  <input className={inputClass()} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Programa AS Gastro" required />
                </Field>
                <Field label="Status">
                  <select className={inputClass()} value={form.ativo ? "ativo" : "inativo"} onChange={(e) => setForm({ ...form, ativo: e.target.value === "ativo" })}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </Field>
              </div>

              <Field label="Descrição do programa">
                <textarea className={inputClass()} rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva o que está incluído e para quem é indicado" />
              </Field>

              {/* Itens / Serviços */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">Serviços incluídos</p>
                  <button className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary" type="button" onClick={addItem}>
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar serviço
                  </button>
                </div>

                {form.itens.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-outline-variant bg-surface-low py-6 text-center text-sm text-secondary">
                    Nenhum serviço adicionado. Clique em "Adicionar serviço".
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.itens.map((item, idx) => (
                      <div className="grid gap-2 rounded-lg border border-surface-variant bg-surface-low p-3 sm:grid-cols-[1fr_200px_160px_auto]" key={idx}>
                        <Field label={`Serviço ${idx + 1}`}>
                          <select
                            className={inputClass()}
                            value={item.servicoId ?? ""}
                            onChange={(e) => e.target.value ? selectService(idx, e.target.value) : updateItem(idx, { servicoId: null, nomeServico: "" })}
                          >
                            <option value="">Serviço avulso</option>
                            {services.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                          </select>
                        </Field>
                        <Field label="Nome exibido">
                          <input className={inputClass()} value={item.nomeServico} onChange={(e) => updateItem(idx, { nomeServico: e.target.value })} placeholder="Nome do serviço" />
                        </Field>
                        <Field label="Valor individual (R$)">
                          <input className={inputClass()} type="number" min={0} step="0.01" value={item.precoIndividual} onChange={(e) => updateItem(idx, { precoIndividual: Number(e.target.value) })} />
                        </Field>
                        <button className="mt-5 rounded-lg p-2 text-secondary hover:bg-red-50 hover:text-error" type="button" onClick={() => removeItem(idx)}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumo de valores */}
              {form.itens.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary-wash p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-secondary">Total sem desconto</p>
                      <p className="mt-1 text-xl font-bold text-ink">{brl.format(valorTotal)}</p>
                    </div>
                    <div>
                      <Field label="Valor com desconto (R$) *">
                        <input
                          className={inputClass()}
                          type="number"
                          min={0}
                          step="0.01"
                          value={form.valorComDesconto}
                          onChange={(e) => setForm({ ...form, valorComDesconto: Number(e.target.value) })}
                        />
                      </Field>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-secondary">Economia</p>
                      <p className={`mt-1 text-xl font-bold ${(valorTotal - form.valorComDesconto) > 0 ? "text-emerald-600" : "text-secondary"}`}>
                        {brl.format(Math.max(0, valorTotal - form.valorComDesconto))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-surface-variant pt-4">
                <button className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium hover:border-error hover:text-error" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60" type="submit" disabled={saving}>
                  {saving ? "Salvando..." : form.id ? "Atualizar programa" : "Criar programa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista */}
      {filtered.length === 0 ? (
        <SectionCard title="Programas de Descontos">
          <EmptyState
            title="Nenhum programa cadastrado"
            message="Crie programas comerciais com múltiplos serviços para facilitar a geração de orçamentos."
          />
          <div className="mt-4 flex justify-center">
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark" type="button" onClick={openCreate}>
              <Package className="h-4 w-4" />
              Criar primeiro programa
            </button>
          </div>
        </SectionCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <ProgramaCard key={p.id} programa={p} onEdit={openEdit} onDelete={(id) => void onDelete(id)} />
          ))}
        </div>
      )}
    </div>
  );
}
