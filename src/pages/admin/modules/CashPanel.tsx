import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, FileText, Printer, RefreshCcw, TrendingDown } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { brl, todayISO } from "../../../lib/formatters";
import { askDeby } from "../../../services/debyService";
import {
  closeCashRegister,
  createOperationalExpense,
  createOperationalPayment,
  loadOperationalCash,
  type CashEntry
} from "../../../services/cashService";
import type { UserRole } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";
import { RefinedTable } from "../components/RefinedTable";
import { StatusPill } from "../components/StatusPill";

const FORMAS_PAGAMENTO = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "cartao_debito", label: "Cartão de débito" }
];

const CATEGORIAS_DESPESA = [
  "Aluguel", "Equipamentos", "Material clínico",
  "Material de escritório", "Serviços", "Outros"
];

function weekStartISO() {
  const date = new Date(`${todayISO()}T12:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

const FORMA_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "Pix",
  cartao_credito: "Cartão de crédito", cartao_debito: "Cartão de débito", manual: "Manual"
};

interface ClosingReport {
  data: string;
  totalRecebido: number;
  totalDespesas: number;
  totalPendente: number;
  saldoLiquido: number;
  entries: CashEntry[];
  notes: string;
}

function printClosingReport(report: ClosingReport) {
  const fmt = (v: number) => brl.format(v);
  const pagamentos = report.entries.filter((e) => e.tipo === "pagamento");
  const despesas = report.entries.filter((e) => e.tipo === "despesa");
  const dataFormatada = new Date(`${report.data}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const rows = (list: CashEntry[]) => list.map((e) =>
    `<tr>
      <td>${new Date(`${e.data}T12:00:00`).toLocaleDateString("pt-BR")}</td>
      <td>${e.descricao}</td>
      <td><span class="${e.tipo === "despesa" ? "badge-despesa" : "badge-pago"}">${e.tipo === "despesa" ? "Despesa" : "Recebimento"}</span></td>
      <td style="text-align:right">${fmt(e.valor)}</td>
    </tr>`
  ).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Fechamento de Caixa</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #15a898; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: 700; color: #15a898; }
    .brand small { display: block; font-size: 12px; font-weight: 400; color: #666; margin-top: 2px; }
    .doc-title { font-size: 14px; font-weight: 600; color: #444; text-align: right; }
    .doc-title small { display: block; font-size: 12px; font-weight: 400; color: #888; }
    .kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
    .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; }
    .kpi label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #888; }
    .kpi .value { font-size: 20px; font-weight: 800; margin-top: 4px; }
    .kpi.receita .value { color: #15a898; }
    .kpi.despesa .value { color: #ef4444; }
    .kpi.liquido .value { color: #1d4ed8; }
    .kpi.pendente .value { color: #f59e0b; }
    h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin: 20px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f9fafb; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #666; border-bottom: 1px solid #e5e7eb; }
    td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
    .badge-pago { background: #d1fae5; color: #065f46; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
    .badge-despesa { background: #fee2e2; color: #991b1b; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
    .empty { color: #aaa; font-style: italic; font-size: 12px; padding: 12px; text-align: center; }
    .notes { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #166534; margin-top: 20px; }
    .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #aaa; text-align: center; }
    @media print { body { padding: 16px; } .kpis { grid-template-columns: repeat(4,1fr); } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Análise Saúde<small>Sistema de Gestão Clínica</small></div>
    </div>
    <div class="doc-title">
      Relatório de Fechamento de Caixa
      <small>${dataFormatada}</small>
    </div>
  </div>
  <div class="kpis">
    <div class="kpi receita"><label>Total recebido</label><div class="value">${fmt(report.totalRecebido)}</div></div>
    <div class="kpi despesa"><label>Total despesas</label><div class="value">${fmt(report.totalDespesas)}</div></div>
    <div class="kpi pendente"><label>Pendências</label><div class="value">${fmt(report.totalPendente)}</div></div>
    <div class="kpi liquido"><label>Saldo líquido</label><div class="value">${fmt(report.saldoLiquido)}</div></div>
  </div>
  <h2>Recebimentos (${pagamentos.length})</h2>
  ${pagamentos.length > 0 ? `
  <table>
    <thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th style="text-align:right">Valor</th></tr></thead>
    <tbody>${rows(pagamentos)}</tbody>
  </table>` : `<p class="empty">Nenhum recebimento no período.</p>`}
  <h2>Despesas (${despesas.length})</h2>
  ${despesas.length > 0 ? `
  <table>
    <thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th style="text-align:right">Valor</th></tr></thead>
    <tbody>${rows(despesas)}</tbody>
  </table>` : `<p class="empty">Nenhuma despesa no período.</p>`}
  ${report.notes ? `<div class="notes"><strong>Observações:</strong> ${report.notes}</div>` : ""}
  <div class="footer">Relatório gerado em ${new Date().toLocaleString("pt-BR")} · Análise Saúde System</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

export function CashPanel({ clinicId, role }: { readonly clinicId: string; readonly role: UserRole }) {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [range, setRange] = useState({ start: weekStartISO(), end: todayISO() });
  const [payment, setPayment] = useState({ descricao: "", valor: 0, formaPagamento: "dinheiro", data: todayISO() });
  const [expense, setExpense] = useState({ descricao: "", categoria: "Outros", valor: 0, data: todayISO() });
  const [notes, setNotes] = useState("");
  const [debyOutput, setDebyOutput] = useState("");
  const [report, setReport] = useState<ClosingReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      setEntries(await loadOperationalCash(clinicId, range.start, range.end));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar o caixa.");
    } finally {
      setLoading(false);
    }
  }, [clinicId, range.end, range.start]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => ({
    received: entries.filter((e) => e.tipo === "pagamento" && e.status === "pago").reduce((s, e) => s + e.valor, 0),
    expenses: entries.filter((e) => e.tipo === "despesa" && e.status !== "cancelado").reduce((s, e) => s + e.valor, 0),
    pending: entries.filter((e) => e.tipo === "pagamento" && ["pendente", "atrasado"].includes(e.status)).reduce((s, e) => s + e.valor, 0),
    count: entries.length
  }), [entries]);

  async function handleCreatePayment() {
    if (!payment.descricao.trim()) { setMessage("Informe a descrição do pagamento."); return; }
    if (payment.valor <= 0) { setMessage("Informe um valor maior que zero."); return; }
    try {
      await createOperationalPayment(clinicId, payment);
      setPayment({ descricao: "", valor: 0, formaPagamento: "dinheiro", data: todayISO() });
      setMessage("Pagamento registrado com sucesso.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao registrar pagamento.");
    }
  }

  async function handleCreateExpense() {
    if (!expense.descricao.trim()) { setMessage("Informe a descrição da despesa."); return; }
    if (expense.valor <= 0) { setMessage("Informe um valor maior que zero."); return; }
    try {
      await createOperationalExpense(clinicId, expense);
      setExpense({ descricao: "", categoria: "Outros", valor: 0, data: todayISO() });
      setMessage("Despesa registrada com sucesso.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao registrar despesa.");
    }
  }

  async function handleClose() {
    try {
      await closeCashRegister(clinicId, todayISO(), notes);
      const todayEntries = entries.filter((e) => e.data === todayISO());
      const closingReport: ClosingReport = {
        data: todayISO(),
        totalRecebido: totals.received,
        totalDespesas: totals.expenses,
        totalPendente: totals.pending,
        saldoLiquido: totals.received - totals.expenses,
        entries: todayEntries.length > 0 ? todayEntries : entries,
        notes
      };
      setReport(closingReport);
      setMessage("Fechamento de caixa salvo.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao fechar caixa.");
    }
  }

  async function handleDeby() {
    setDebyOutput("");
    const text = entries.map((e) => `${e.data} | ${e.tipo} | ${e.status} | ${e.descricao} | ${brl.format(e.valor)}`).join("\n");
    const output = await askDeby({
      clinicId,
      action: "finance_insights",
      module: "caixa",
      text: `Perfil: ${role}\nCaixa operacional de ${range.start} a ${range.end}\nRecebido: ${brl.format(totals.received)}\nDespesas: ${brl.format(totals.expenses)}\nPendente: ${brl.format(totals.pending)}\nLançamentos:\n${text}`
    });
    setDebyOutput(output);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border border-surface-variant bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">Recebido no período</p>
          <p className="mt-2 text-2xl font-bold text-primary">{brl.format(totals.received)}</p>
        </div>
        <div className="rounded-lg border border-surface-variant bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">Despesas no período</p>
          <p className="mt-2 text-2xl font-bold text-error">{brl.format(totals.expenses)}</p>
        </div>
        <div className="rounded-lg border border-surface-variant bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">Pendências</p>
          <p className="mt-2 text-2xl font-bold text-warning">{brl.format(totals.pending)}</p>
        </div>
        <div className="rounded-lg border border-surface-variant bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">Saldo líquido</p>
          <p className={`mt-2 text-2xl font-bold ${(totals.received - totals.expenses) >= 0 ? "text-on-surface" : "text-error"}`}>{brl.format(totals.received - totals.expenses)}</p>
        </div>
      </section>

      <SectionCard title="Movimentações do período" description="Pagamentos recebidos e despesas registradas.">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Field label="Início">
            <input className={inputClass()} type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} />
          </Field>
          <Field label="Fim">
            <input className={inputClass()} type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} />
          </Field>
          <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 text-sm font-medium hover:border-primary hover:text-primary" type="button" onClick={() => void load()}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </button>
        </div>

        {message ? (
          <p className="mb-3 rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 text-sm text-secondary">{message}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-secondary">Carregando caixa...</p>
        ) : entries.length === 0 ? (
          <EmptyState title="Sem lançamentos" message="Os recebimentos e despesas do período aparecerão aqui." />
        ) : (
          <RefinedTable headers={["Data", "Descrição", "Tipo", "Status", "Forma Pgto", "Valor"]}>
            {entries.map((entry) => (
              <tr className="border-b border-surface-variant hover:bg-teal-50/60" key={entry.id}>
                <td className="px-4 py-3 text-secondary">{new Date(`${entry.data}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 font-medium">{entry.descricao}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${entry.tipo === "despesa" ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal-700"}`}>
                    {entry.tipo === "despesa" ? "Despesa" : "Recebimento"}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusPill value={entry.status} /></td>
                <td className="px-4 py-3 text-secondary">{entry.formaPagamento ? (FORMA_LABEL[entry.formaPagamento] ?? entry.formaPagamento) : "-"}</td>
                <td className={`px-4 py-3 text-right font-semibold ${entry.tipo === "despesa" ? "text-error" : ""}`}>{brl.format(entry.valor)}</td>
              </tr>
            ))}
          </RefinedTable>
        )}
      </SectionCard>

      <SectionCard title="Registrar recebimento" description="Registre os pagamentos recebidos no balcão.">
        <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_160px_200px_140px_auto]" onSubmit={(e) => { e.preventDefault(); void handleCreatePayment(); }}>
          <Field label="Descrição">
            <input className={inputClass()} value={payment.descricao} onChange={(e) => setPayment({ ...payment, descricao: e.target.value })} placeholder="Ex: Consulta particular" />
          </Field>
          <Field label="Valor (R$)">
            <input className={inputClass()} min={0.01} step="0.01" type="number" value={payment.valor || ""} placeholder="0,00" onChange={(e) => setPayment({ ...payment, valor: Number(e.target.value) })} />
          </Field>
          <Field label="Forma de pagamento">
            <select className={inputClass()} value={payment.formaPagamento} onChange={(e) => setPayment({ ...payment, formaPagamento: e.target.value })}>
              {FORMAS_PAGAMENTO.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
            </select>
          </Field>
          <Field label="Data">
            <input className={inputClass()} type="date" value={payment.data} onChange={(e) => setPayment({ ...payment, data: e.target.value })} />
          </Field>
          <button className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark sm:col-span-2 xl:col-span-1 xl:mt-5" type="submit">
            Registrar
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Registrar despesa" description="Registre gastos e saídas operacionais do caixa.">
        <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_180px_140px_140px_auto]" onSubmit={(e) => { e.preventDefault(); void handleCreateExpense(); }}>
          <Field label="Descrição">
            <input className={inputClass()} value={expense.descricao} onChange={(e) => setExpense({ ...expense, descricao: e.target.value })} placeholder="Ex: Material de limpeza" />
          </Field>
          <Field label="Categoria">
            <select className={inputClass()} value={expense.categoria} onChange={(e) => setExpense({ ...expense, categoria: e.target.value })}>
              {CATEGORIAS_DESPESA.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </Field>
          <Field label="Valor (R$)">
            <input className={inputClass()} min={0.01} step="0.01" type="number" value={expense.valor || ""} placeholder="0,00" onChange={(e) => setExpense({ ...expense, valor: Number(e.target.value) })} />
          </Field>
          <Field label="Data">
            <input className={inputClass()} type="date" value={expense.data} onChange={(e) => setExpense({ ...expense, data: e.target.value })} />
          </Field>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-white px-4 text-sm font-medium hover:border-error hover:text-error sm:col-span-2 xl:col-span-1 xl:mt-5" type="submit">
            <TrendingDown className="h-4 w-4" />
            Registrar
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Fechamento do dia" description="Consolida entradas e saídas e gera relatório do período.">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Field label="Observações (opcional)">
            <textarea className={inputClass()} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Divergências, pendências e observações do fechamento" />
          </Field>
          <div className="mt-5 flex flex-col gap-2">
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark" type="button" onClick={() => void handleClose()}>
              <CheckCircle2 className="h-4 w-4" />
              Fechar caixa
            </button>
            {report && (
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 text-sm font-medium hover:border-primary hover:text-primary" type="button" onClick={() => printClosingReport(report)}>
                <Printer className="h-4 w-4" />
                Imprimir relatório
              </button>
            )}
          </div>
        </div>
        {report && (
          <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-700" />
              <p className="text-sm font-semibold text-teal-800">Resumo do fechamento — {new Date(`${report.data}T12:00:00`).toLocaleDateString("pt-BR")}</p>
            </div>
            <div className="grid gap-2 text-sm text-teal-900 sm:grid-cols-2 lg:grid-cols-4">
              <div><span className="font-semibold">Recebido:</span> {brl.format(report.totalRecebido)}</div>
              <div><span className="font-semibold">Despesas:</span> {brl.format(report.totalDespesas)}</div>
              <div><span className="font-semibold">Pendências:</span> {brl.format(report.totalPendente)}</div>
              <div><span className="font-semibold">Saldo líquido:</span> {brl.format(report.saldoLiquido)}</div>
            </div>
            {report.notes && <p className="mt-2 text-xs text-teal-700"><strong>Obs:</strong> {report.notes}</p>}
          </div>
        )}
      </SectionCard>

      {role === "admin" ? (
        <SectionCard title="Análise IA" description="Análise financeira do período disponível para administradores.">
          <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium hover:border-primary hover:text-primary" type="button" onClick={() => void handleDeby()}>
            <Bot className="h-4 w-4" />
            Analisar caixa
          </button>
          {debyOutput ? (
            <div className="mt-3 whitespace-pre-wrap rounded-lg border border-surface-variant bg-surface-container-low p-3 text-sm text-on-surface">{debyOutput}</div>
          ) : null}
        </SectionCard>
      ) : null}
    </div>
  );
}
