import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, RefreshCcw, TrendingDown } from "lucide-react";
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
  "Aluguel",
  "Equipamentos",
  "Material clínico",
  "Material de escritório",
  "Serviços",
  "Outros"
];

function weekStartISO() {
  const date = new Date(`${todayISO()}T12:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

const FORMA_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  manual: "Manual"
};

export function CashPanel({ clinicId, role }: { readonly clinicId: string; readonly role: UserRole }) {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [range, setRange] = useState({ start: weekStartISO(), end: todayISO() });
  const [payment, setPayment] = useState({ descricao: "", valor: 0, formaPagamento: "dinheiro", data: todayISO() });
  const [expense, setExpense] = useState({ descricao: "", categoria: "Outros", valor: 0, data: todayISO() });
  const [notes, setNotes] = useState("");
  const [debyOutput, setDebyOutput] = useState("");

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

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => ({
    received: entries.filter((e) => e.status === "pago").reduce((sum, e) => sum + e.valor, 0),
    pending: entries.filter((e) => ["pendente", "atrasado"].includes(e.status)).reduce((sum, e) => sum + e.valor, 0),
    count: entries.length
  }), [entries]);

  async function handleCreatePayment() {
    if (!payment.descricao.trim() || payment.valor <= 0) return;
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
    if (!expense.descricao.trim() || expense.valor <= 0) return;
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
      setMessage("Fechamento de caixa salvo.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao fechar caixa.");
    }
  }

  async function handleDeby() {
    setDebyOutput("");
    const text = entries.map((e) => `${e.data} | ${e.status} | ${e.descricao} | ${brl.format(e.valor)}`).join("\n");
    const output = await askDeby({
      clinicId,
      action: "finance_insights",
      module: "caixa",
      text: `Perfil: ${role}\nCaixa operacional de ${range.start} a ${range.end}\nRecebido: ${brl.format(totals.received)}\nPendente: ${brl.format(totals.pending)}\nLançamentos:\n${text}`
    });
    setDebyOutput(output);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-surface-variant bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">Recebido no período</p>
          <p className="mt-2 text-2xl font-bold text-on-surface">{brl.format(totals.received)}</p>
        </div>
        <div className="rounded-lg border border-surface-variant bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">Pendências do período</p>
          <p className="mt-2 text-2xl font-bold text-error">{brl.format(totals.pending)}</p>
        </div>
        <div className="rounded-lg border border-surface-variant bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">Lançamentos</p>
          <p className="mt-2 text-2xl font-bold text-primary">{totals.count}</p>
        </div>
      </section>

      <SectionCard title="Recebimentos" description="Registre os pagamentos recebidos e acompanhe o caixa do período.">
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

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Registrar pagamento recebido</p>
        <form
          className="mb-5 grid gap-3 md:grid-cols-[1fr_160px_210px_160px_auto]"
          onSubmit={(e) => { e.preventDefault(); void handleCreatePayment(); }}
        >
          <Field label="Descrição">
            <input className={inputClass()} value={payment.descricao} onChange={(e) => setPayment({ ...payment, descricao: e.target.value })} placeholder="Ex: Consulta particular" />
          </Field>
          <Field label="Valor (R$)">
            <input className={inputClass()} min={0.01} step="0.01" type="number" value={payment.valor || ""} onChange={(e) => setPayment({ ...payment, valor: Number(e.target.value) })} />
          </Field>
          <Field label="Forma de pagamento">
            <select className={inputClass()} value={payment.formaPagamento} onChange={(e) => setPayment({ ...payment, formaPagamento: e.target.value })}>
              {FORMAS_PAGAMENTO.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Data">
            <input className={inputClass()} type="date" value={payment.data} onChange={(e) => setPayment({ ...payment, data: e.target.value })} />
          </Field>
          <button className="mt-5 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark" type="submit">
            Registrar
          </button>
        </form>

        {message ? (
          <p className="mb-3 rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 text-sm text-secondary">{message}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-secondary">Carregando caixa...</p>
        ) : entries.length === 0 ? (
          <EmptyState title="Sem lançamentos" message="Os recebimentos do período aparecerão aqui." />
        ) : (
          <RefinedTable headers={["Data", "Descrição", "Status", "Forma de pagamento", "Valor"]}>
            {entries.map((entry) => (
              <tr className="border-b border-surface-variant hover:bg-teal-50/60" key={entry.id}>
                <td className="px-4 py-3 text-secondary">{new Date(`${entry.data}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 font-medium">{entry.descricao}</td>
                <td className="px-4 py-3"><StatusPill value={entry.status} /></td>
                <td className="px-4 py-3 text-secondary">{entry.formaPagamento ? (FORMA_LABEL[entry.formaPagamento] ?? entry.formaPagamento) : "-"}</td>
                <td className="px-4 py-3 text-right font-semibold">{brl.format(entry.valor)}</td>
              </tr>
            ))}
          </RefinedTable>
        )}
      </SectionCard>

      <SectionCard title="Registrar despesa" description="Registre gastos e saídas operacionais do caixa.">
        <form
          className="grid gap-3 md:grid-cols-[1fr_200px_160px_160px_auto]"
          onSubmit={(e) => { e.preventDefault(); void handleCreateExpense(); }}
        >
          <Field label="Descrição">
            <input className={inputClass()} value={expense.descricao} onChange={(e) => setExpense({ ...expense, descricao: e.target.value })} placeholder="Ex: Material de limpeza" />
          </Field>
          <Field label="Categoria">
            <select className={inputClass()} value={expense.categoria} onChange={(e) => setExpense({ ...expense, categoria: e.target.value })}>
              {CATEGORIAS_DESPESA.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </Field>
          <Field label="Valor (R$)">
            <input className={inputClass()} min={0.01} step="0.01" type="number" value={expense.valor || ""} onChange={(e) => setExpense({ ...expense, valor: Number(e.target.value) })} />
          </Field>
          <Field label="Data">
            <input className={inputClass()} type="date" value={expense.data} onChange={(e) => setExpense({ ...expense, data: e.target.value })} />
          </Field>
          <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-white px-4 text-sm font-medium hover:border-error hover:text-error" type="submit">
            <TrendingDown className="h-4 w-4" />
            Registrar despesa
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Fechamento do dia">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Field label="Observações">
            <textarea className={inputClass()} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Divergências, pendências e observações do fechamento" />
          </Field>
          <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark" type="button" onClick={() => void handleClose()}>
            <CheckCircle2 className="h-4 w-4" />
            Fechar caixa
          </button>
        </div>
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
