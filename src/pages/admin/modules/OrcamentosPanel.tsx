import { useState } from "react";
import { Check, Copy, ExternalLink, FileText, MessageCircle, Printer, Plus, Trash2, X } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { brl, todayISO } from "../../../lib/formatters";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
import type { Service } from "../../../types/clinic";
import type { ProgramaDesconto } from "./DiscountProgramsPanel";
import { Field, inputClass } from "../components/Field";

export interface OrcamentoItem {
  id?: string;
  servicoId: string | null;
  programaId: string | null;
  nome: string;
  descricao: string;
  precoIndividual: number;
  quantidade: number;
  tipo: "servico" | "programa";
}

export interface Orcamento {
  id: string;
  clinicaId: string;
  pacienteId: string | null;
  pacienteNome: string;
  pacienteCpf: string;
  pacienteWhatsapp: string;
  atendenteNome: string;
  observacoes: string;
  valorTotal: number;
  valorComDesconto: number | null;
  tokenPublico: string;
  status: "ativo" | "expirado" | "cancelado" | "aceito";
  validade: string | null;
  createdAt: string;
  itens: OrcamentoItem[];
}

export type OrcamentoForm = {
  id?: string;
  pacienteNome: string;
  pacienteCpf: string;
  pacienteWhatsapp: string;
  atendenteNome: string;
  observacoes: string;
  valorComDesconto: number | null;
  validade: string;
  itens: OrcamentoItem[];
};

function emptyForm(): OrcamentoForm {
  const validade = new Date();
  validade.setDate(validade.getDate() + 30);
  return { pacienteNome: "", pacienteCpf: "", pacienteWhatsapp: "", atendenteNome: "", observacoes: "", valorComDesconto: null, validade: validade.toISOString().slice(0, 10), itens: [] };
}

// Gera e abre janela de impressão com o orçamento formatado
function printOrcamento(orc: Orcamento, clinicaNome: string) {
  const fmt = (v: number) => brl.format(v);
  const dataEmissao = new Date(orc.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const validade = orc.validade ? new Date(`${orc.validade}T12:00:00`).toLocaleDateString("pt-BR") : "Não informada";
  const economia = orc.valorTotal - (orc.valorComDesconto ?? orc.valorTotal);

  const rows = orc.itens.map((i) => `
    <tr>
      <td>${i.nome}</td>
      <td>${i.descricao || "-"}</td>
      <td style="text-align:center">${i.quantidade}</td>
      <td style="text-align:right">${fmt(i.precoIndividual)}</td>
      <td style="text-align:right;font-weight:600">${fmt(i.precoIndividual * i.quantidade)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Orçamento - ${orc.pacienteNome}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 32px; max-width: 860px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #15a898; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .brand-name { font-size: 20px; font-weight: 800; color: #15a898; line-height: 1; }
    .brand-sub { font-size: 11px; color: #888; font-weight: 400; margin-top: 2px; letter-spacing: 0.05em; text-transform: uppercase; }
    .doc-label { font-size: 18px; font-weight: 700; color: #1a1a1a; text-align: right; }
    .doc-date { font-size: 12px; color: #888; text-align: right; margin-top: 4px; }
    .section { margin: 20px 0; }
    .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #15a898; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .info-item label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #aaa; }
    .info-item p { font-size: 13px; font-weight: 500; color: #1a1a1a; margin-top: 1px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
    thead th { background: #f0fdf4; padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #15a898; border-bottom: 2px solid #bbf7d0; }
    tbody td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; }
    tbody tr:hover { background: #f9fafb; }
    .totals { margin-top: 16px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .total-row { display: flex; gap: 24px; align-items: baseline; }
    .total-label { font-size: 12px; color: #888; text-align: right; width: 180px; }
    .total-value { font-size: 14px; font-weight: 600; text-align: right; width: 120px; }
    .total-final .total-label { font-size: 14px; font-weight: 700; color: #1a1a1a; }
    .total-final .total-value { font-size: 22px; font-weight: 800; color: #15a898; }
    .economia { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 16px; display: inline-flex; gap: 8px; align-items: center; margin-top: 8px; }
    .economia-label { font-size: 11px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.05em; }
    .economia-value { font-size: 16px; font-weight: 800; color: #16a34a; }
    .notes { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #475569; margin-top: 16px; }
    .footer-msg { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center; }
    .validity { font-size: 11px; color: #f59e0b; font-weight: 600; margin-top: 4px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div>
        <div class="brand-name">${clinicaNome}</div>
        <div class="brand-sub">Sistema de Gestão Clínica</div>
      </div>
    </div>
    <div>
      <div class="doc-label">Orçamento</div>
      <div class="doc-date">Emitido em ${dataEmissao}</div>
      <div class="validity">Válido até ${validade}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dados do paciente</div>
    <div class="info-grid">
      <div class="info-item"><label>Nome completo</label><p>${orc.pacienteNome}</p></div>
      <div class="info-item"><label>CPF</label><p>${orc.pacienteCpf || "Não informado"}</p></div>
      <div class="info-item"><label>WhatsApp</label><p>${orc.pacienteWhatsapp || "Não informado"}</p></div>
      <div class="info-item"><label>Atendente responsável</label><p>${orc.atendenteNome || "Não informado"}</p></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Serviços e valores</div>
    <table>
      <thead><tr><th>Serviço / Programa</th><th>Descrição</th><th style="text-align:center">Qtd.</th><th style="text-align:right">Valor unit.</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="total-row">
        <span class="total-label">Subtotal (sem desconto):</span>
        <span class="total-value">${fmt(orc.valorTotal)}</span>
      </div>
      ${orc.valorComDesconto !== null && orc.valorComDesconto < orc.valorTotal ? `
      <div class="total-row total-final">
        <span class="total-label">Total com desconto:</span>
        <span class="total-value">${fmt(orc.valorComDesconto)}</span>
      </div>` : `
      <div class="total-row total-final">
        <span class="total-label">Total:</span>
        <span class="total-value">${fmt(orc.valorTotal)}</span>
      </div>`}
    </div>
    ${economia > 0 ? `<div style="text-align:right;margin-top:8px"><div class="economia"><span class="economia-label">Economia com o programa</span><span class="economia-value">${fmt(economia)}</span></div></div>` : ""}
  </div>

  ${orc.observacoes ? `<div class="notes"><strong>Observações:</strong> ${orc.observacoes}</div>` : ""}

  <div class="footer-msg">
    Este orçamento é válido até ${validade}. Para mais informações entre em contato com nossa equipe.<br>
    ${clinicaNome} · Gerado em ${new Date().toLocaleString("pt-BR")}
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=960,height=750");
  if (!win) { alert("Habilite pop-ups para gerar o PDF."); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

export function OrcamentosPanel({
  orcamentos,
  services,
  programas,
  clinicaNome,
  clinicaUrl,
  onSave,
  onDelete
}: {
  readonly orcamentos: Orcamento[];
  readonly services: Service[];
  readonly programas: ProgramaDesconto[];
  readonly clinicaNome: string;
  readonly clinicaUrl: string;
  readonly onSave: (form: OrcamentoForm) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OrcamentoForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const valorTotal = form.itens.reduce((s, i) => s + i.precoIndividual * i.quantidade, 0);

  function openCreate() {
    setForm(emptyForm());
    setError(null);
    setShowForm(true);
  }

  function addServico() {
    const svc = services[0];
    if (!svc) return;
    setForm({ ...form, itens: [...form.itens, { servicoId: svc.id, programaId: null, nome: svc.nome, descricao: "", precoIndividual: svc.preco, quantidade: 1, tipo: "servico" }] });
  }

  function addPrograma() {
    const prog = programas[0];
    if (!prog) return;
    setForm({ ...form, itens: [...form.itens, { servicoId: null, programaId: prog.id, nome: prog.nome, descricao: prog.descricao, precoIndividual: prog.valorComDesconto, quantidade: 1, tipo: "programa" }] });
  }

  function removeItem(idx: number) {
    setForm({ ...form, itens: form.itens.filter((_, i) => i !== idx) });
  }

  function updateItem(idx: number, patch: Partial<OrcamentoItem>) {
    setForm({ ...form, itens: form.itens.map((item, i) => i === idx ? { ...item, ...patch } : item) });
  }

  function selectService(idx: number, id: string) {
    const svc = services.find((s) => s.id === id);
    if (svc) updateItem(idx, { servicoId: id, nome: svc.nome, precoIndividual: svc.preco });
  }

  function selectPrograma(idx: number, id: string) {
    const prog = programas.find((p) => p.id === id);
    if (prog) updateItem(idx, { programaId: id, nome: prog.nome, descricao: prog.descricao, precoIndividual: prog.valorComDesconto });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.pacienteNome.trim()) { setError("Informe o nome do paciente."); return; }
    if (form.itens.length === 0) { setError("Adicione pelo menos um serviço ou programa."); return; }
    setSaving(true);
    try {
      await onSave({ ...form, pacienteNome: form.pacienteNome.trim() });
      setShowForm(false);
      setForm(emptyForm());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar orçamento.");
    } finally {
      setSaving(false);
    }
  }

  function getPublicLink(token: string) {
    return `${clinicaUrl}/orcamento/${token}`;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(getPublicLink(token));
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function sendWhatsApp(orc: Orcamento) {
    const phone = orc.pacienteWhatsapp.replace(/\D/g, "");
    if (!phone) { alert("WhatsApp não informado no orçamento."); return; }
    const link = getPublicLink(orc.tokenPublico);
    const msg = encodeURIComponent(`Olá, ${orc.pacienteNome}! Segue o orçamento solicitado na ${clinicaNome}: ${link}\n\nQualquer dúvida, estamos à disposição. 😊`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-secondary">Gere orçamentos profissionais para pacientes com serviços individuais ou Programas de Descontos.</p>
        <button className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark" type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo orçamento
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-6 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-xl border border-surface-variant bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-surface-variant px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Orçamentos</p>
                <h2 className="text-lg font-bold text-ink">Novo orçamento</h2>
              </div>
              <button className="rounded-md p-1.5 text-secondary hover:bg-surface-low" type="button" onClick={() => setShowForm(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="space-y-4 p-5" onSubmit={(e) => { void handleSubmit(e); }}>
              {error && <div className="rounded-lg border border-error/30 bg-red-50 px-4 py-2.5 text-sm text-error">{error}</div>}

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-secondary">Dados do paciente</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nome completo *"><input className={inputClass()} value={form.pacienteNome} onChange={(e) => setForm({ ...form, pacienteNome: e.target.value })} placeholder="Nome do paciente" required /></Field>
                  <Field label="CPF"><input className={inputClass()} value={form.pacienteCpf} onChange={(e) => setForm({ ...form, pacienteCpf: e.target.value })} placeholder="000.000.000-00" /></Field>
                  <Field label="WhatsApp"><input className={inputClass()} value={form.pacienteWhatsapp} onChange={(e) => setForm({ ...form, pacienteWhatsapp: e.target.value })} placeholder="(00) 00000-0000" /></Field>
                  <Field label="Atendente responsável"><input className={inputClass()} value={form.atendenteNome} onChange={(e) => setForm({ ...form, atendenteNome: e.target.value })} placeholder="Nome da atendente" /></Field>
                </div>
              </div>

              {/* Itens */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-secondary">Serviços e programas</p>
                  <div className="flex gap-2">
                    {services.length > 0 && (
                      <button className="rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary" type="button" onClick={addServico}>+ Serviço</button>
                    )}
                    {programas.length > 0 && (
                      <button className="rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary" type="button" onClick={addPrograma}>+ Programa</button>
                    )}
                  </div>
                </div>

                {form.itens.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-outline-variant bg-surface-low py-6 text-center text-sm text-secondary">
                    Nenhum item adicionado.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.itens.map((item, idx) => (
                      <div className="rounded-lg border border-surface-variant bg-surface-low p-3" key={idx}>
                        <div className="grid gap-2 sm:grid-cols-[1fr_160px_80px_auto]">
                          <Field label={item.tipo === "programa" ? "Programa" : "Serviço"}>
                            {item.tipo === "programa" ? (
                              <select className={inputClass()} value={item.programaId ?? ""} onChange={(e) => selectPrograma(idx, e.target.value)}>
                                {programas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                              </select>
                            ) : (
                              <select className={inputClass()} value={item.servicoId ?? ""} onChange={(e) => selectService(idx, e.target.value)}>
                                {services.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                              </select>
                            )}
                          </Field>
                          <Field label="Valor (R$)">
                            <input className={inputClass()} type="number" min={0} step="0.01" value={item.precoIndividual} onChange={(e) => updateItem(idx, { precoIndividual: Number(e.target.value) })} />
                          </Field>
                          <Field label="Qtd.">
                            <input className={inputClass()} type="number" min={1} value={item.quantidade} onChange={(e) => updateItem(idx, { quantidade: Math.max(1, Number(e.target.value)) })} />
                          </Field>
                          <button className="mt-5 rounded-lg p-2 text-secondary hover:bg-red-50 hover:text-error" type="button" onClick={() => removeItem(idx)}>
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <Field label="Descrição (opcional)">
                          <input className={inputClass()} value={item.descricao} onChange={(e) => updateItem(idx, { descricao: e.target.value })} placeholder="Detalhes do serviço" />
                        </Field>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totais */}
              {form.itens.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary-wash p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-secondary">Total sem desconto</p>
                      <p className="mt-1 text-xl font-bold text-ink">{brl.format(valorTotal)}</p>
                    </div>
                    <div>
                      <Field label="Valor com desconto (R$)">
                        <input
                          className={inputClass()}
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder={brl.format(valorTotal)}
                          value={form.valorComDesconto ?? ""}
                          onChange={(e) => setForm({ ...form, valorComDesconto: e.target.value ? Number(e.target.value) : null })}
                        />
                      </Field>
                    </div>
                    <Field label="Válido até">
                      <input className={inputClass()} type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} />
                    </Field>
                  </div>
                </div>
              )}

              <Field label="Observações">
                <textarea className={inputClass()} rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações para o paciente" />
              </Field>

              <div className="flex justify-end gap-3 border-t border-surface-variant pt-4">
                <button className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium hover:border-error hover:text-error" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60" type="submit" disabled={saving}>
                  {saving ? "Gerando..." : "Criar orçamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista */}
      {orcamentos.length === 0 ? (
        <SectionCard title="Orçamentos">
          <EmptyState title="Nenhum orçamento gerado" message="Crie orçamentos profissionais para pacientes com PDF e link compartilhável." />
          <div className="mt-4 flex justify-center">
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark" type="button" onClick={openCreate}>
              <FileText className="h-4 w-4" />
              Criar primeiro orçamento
            </button>
          </div>
        </SectionCard>
      ) : (
        <div className="space-y-3">
          {orcamentos.map((orc) => {
            const economia = orc.valorTotal - (orc.valorComDesconto ?? orc.valorTotal);
            return (
              <article className="rounded-xl border border-surface-variant bg-white p-4 transition hover:shadow-clinical" key={orc.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{orc.pacienteNome}</p>
                      {orc.pacienteCpf && <span className="text-xs text-secondary">CPF: {orc.pacienteCpf}</span>}
                    </div>
                    {orc.atendenteNome && <p className="mt-0.5 text-xs text-secondary">Atendente: {orc.atendenteNome}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-medium text-secondary">Total: <span className={orc.valorComDesconto ? "line-through opacity-60" : "font-bold text-ink"}>{brl.format(orc.valorTotal)}</span></span>
                      {orc.valorComDesconto !== null && <span className="text-lg font-bold text-primary">{brl.format(orc.valorComDesconto)}</span>}
                      {economia > 0 && <span className="text-xs font-semibold text-emerald-600">Economia: {brl.format(economia)}</span>}
                    </div>
                    <p className="mt-1 text-xs text-secondary">{orc.itens.length} item(s) · Emitido em {new Date(orc.createdAt).toLocaleDateString("pt-BR")}{orc.validade ? ` · Válido até ${new Date(`${orc.validade}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-medium hover:border-primary hover:text-primary transition"
                      type="button"
                      onClick={() => printOrcamento(orc, clinicaNome)}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      PDF
                    </button>
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-medium hover:border-primary hover:text-primary transition"
                      type="button"
                      onClick={() => void copyLink(orc.tokenPublico)}
                    >
                      {copiedId === orc.tokenPublico ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedId === orc.tokenPublico ? "Copiado!" : "Copiar link"}
                    </button>
                    <a
                      href={getPublicLink(orc.tokenPublico)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-medium hover:border-primary hover:text-primary transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Visualizar
                    </a>
                    {orc.pacienteWhatsapp && (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
                        type="button"
                        onClick={() => sendWhatsApp(orc)}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </button>
                    )}
                    <button
                      aria-label="Excluir orçamento"
                      className="rounded-lg p-1.5 text-secondary hover:bg-red-50 hover:text-error transition"
                      type="button"
                      onClick={() => void confirmDangerAction(`Excluir orçamento de ${orc.pacienteNome}?`).then((ok) => { if (ok) onDelete(orc.id); })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {orc.itens.length > 0 && (
                  <div className="mt-3 border-t border-surface-variant pt-3">
                    <div className="flex flex-wrap gap-2">
                      {orc.itens.map((item) => (
                        <span className="rounded-full border border-surface-variant bg-surface-low px-3 py-1 text-xs text-secondary" key={item.id ?? item.nome}>
                          {item.nome} — {brl.format(item.precoIndividual)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
