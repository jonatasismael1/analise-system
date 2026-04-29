import { useState } from "react";
import { Trash2 } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
import { brl, todayISO } from "../../../lib/formatters";
import type { FinanceEntry, Professional } from "../../../types/clinic";
import ExportPage from "../../ExportPage";
import { Field, inputClass } from "../components/Field";
import { RefinedTable } from "../components/RefinedTable";
import { StatusPill } from "../components/StatusPill";

export function FinancePanel({ entries, kpis, onPayment, onExpense, onUpdatePayment, onUpdateExpense, onDeletePayment, onDeleteExpense, professionals, clinicaNome, clinicaCnpj }: { readonly entries: FinanceEntry[]; readonly kpis: { revenue: number; expenses: number; profit: number; overdue: number; forecast: number }; readonly onPayment: (values: { valor: number; status: FinanceEntry["status"]; formaPagamento?: string }) => Promise<void>; readonly onExpense: (values: { descricao: string; categoria?: string; valor: number; status: FinanceEntry["status"] }) => Promise<void>; readonly onUpdatePayment: (id: string, values: { valor: number; status: FinanceEntry["status"]; formaPagamento?: string | null; data?: string | null }) => Promise<void>; readonly onUpdateExpense: (id: string, values: { descricao: string; categoria?: string | null; valor: number; status: FinanceEntry["status"]; data?: string | null }) => Promise<void>; readonly onDeletePayment: (id: string) => Promise<void>; readonly onDeleteExpense: (id: string) => Promise<void>; readonly professionals: Professional[]; readonly clinicaNome: string; readonly clinicaCnpj?: string }) {
  const [activeTab, setActiveTab] = useState<"lancamentos" | "exportar">("lancamentos");
  const [payment, setPayment] = useState({ id: "", descricao: "", valor: 180, status: "pago" as FinanceEntry["status"], formaPagamento: "manual", data: todayISO() });
  const [expense, setExpense] = useState({ id: "", descricao: "", valor: 90, categoria: "Operacional", status: "pendente" as FinanceEntry["status"], data: todayISO() });
  const [filters, setFilters] = useState({ search: "", status: "todos", tipo: "todos" });
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.descricao.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "todos" || entry.status === filters.status;
    const matchesType = filters.tipo === "todos" || (entry.tipo ?? "pagamento") === filters.tipo;
    return matchesSearch && matchesStatus && matchesType;
  });
  return (
    <div className="space-y-5">
      <div className="flex border-b border-surface-variant">
        <button
          className={`px-4 py-3 text-sm font-medium ${activeTab === "lancamentos" ? "border-b-2 border-primary text-primary" : "text-secondary hover:text-on-surface"}`}
          onClick={() => setActiveTab("lancamentos")}
        >
          Lançamentos
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium ${activeTab === "exportar" ? "border-b-2 border-primary text-primary" : "text-secondary hover:text-on-surface"}`}
          onClick={() => setActiveTab("exportar")}
        >
          Exportar
        </button>
      </div>

      {activeTab === "lancamentos" ? (
        <>
          <section className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Receita do Mês", value: kpis.revenue, highlight: false },
          { label: "Despesas", value: kpis.expenses, highlight: false },
          { label: "Lucro Estimado", value: kpis.profit, highlight: kpis.profit > 0 },
          { label: "Inadimplência", value: kpis.overdue, highlight: kpis.overdue > 0, danger: true },
          { label: "Previsto", value: kpis.forecast, highlight: false }
        ].map(({ label, value, highlight, danger }) => (
          <div className="rounded-xl border border-surface-variant bg-white p-4 transition hover:shadow-clinical" key={label}>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">{label}</p>
            <p className={`mt-2 text-xl font-bold ${
              danger && (value as number) > 0 ? "text-error" : highlight ? "text-primary" : "text-on-surface"
            }`}>{brl.format(value as number)}</p>
          </div>
        ))}
      </section>
      <SectionCard title="Financeiro">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Field label="Buscar"><input className={inputClass()} placeholder="Descrição" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></Field>
          <Field label="Status"><select className={inputClass()} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="todos">Todos</option><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option><option value="cancelado">Cancelado</option></select></Field>
          <Field label="Tipo"><select className={inputClass()} value={filters.tipo} onChange={(event) => setFilters({ ...filters, tipo: event.target.value })}><option value="todos">Todos</option><option value="pagamento">Pagamentos</option><option value="despesa">Despesas</option></select></Field>
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          <form className="rounded border border-surface-variant p-3" onSubmit={(event) => { event.preventDefault(); payment.id ? void onUpdatePayment(payment.id, payment) : void onPayment(payment); setPayment({ id: "", descricao: "", valor: 180, status: "pago", formaPagamento: "manual", data: todayISO() }); }}>
            <Field label="Descrição"><input className={inputClass()} placeholder="Ex: Receita extra" value={payment.descricao || ""} onChange={(event) => setPayment({ ...payment, descricao: event.target.value })} required /></Field>
            <Field label="Valor da Receita"><input className={inputClass()} type="number" value={payment.valor} onChange={(event) => setPayment({ ...payment, valor: Number(event.target.value) })} /></Field>
            <Field label="Status"><select className={inputClass()} value={payment.status} onChange={(event) => setPayment({ ...payment, status: event.target.value as FinanceEntry["status"] })}><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option><option value="cancelado">Cancelado</option></select></Field>
            <button className="mt-3 rounded bg-primary px-4 py-2 text-sm text-white">{payment.id ? "Atualizar pagamento" : "Criar pagamento"}</button>
          </form>
          <form className="rounded border border-surface-variant p-3" onSubmit={(event) => { event.preventDefault(); expense.id ? void onUpdateExpense(expense.id, expense) : void onExpense(expense); setExpense({ id: "", descricao: "", valor: 90, categoria: "Operacional", status: "pendente", data: todayISO() }); }}>
            <Field label="Despesa"><input className={inputClass()} value={expense.descricao} onChange={(event) => setExpense({ ...expense, descricao: event.target.value })} required /></Field>
            <Field label="Valor"><input className={inputClass()} type="number" value={expense.valor} onChange={(event) => setExpense({ ...expense, valor: Number(event.target.value) })} /></Field>
            <Field label="Status"><select className={inputClass()} value={expense.status} onChange={(event) => setExpense({ ...expense, status: event.target.value as FinanceEntry["status"] })}><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option><option value="cancelado">Cancelado</option></select></Field>
            <button className="mt-3 rounded bg-primary px-4 py-2 text-sm text-white">{expense.id ? "Atualizar despesa" : "Criar despesa"}</button>
          </form>
        </div>
        {filteredEntries.length === 0 ? <EmptyState title="Nenhum lançamento" message="Pagamentos e despesas cadastrados aparecerão aqui." /> : <RefinedTable headers={["Descrição", "Tipo", "Status", "Valor", "Ações"]}>{filteredEntries.map((entry) => <tr className="border-b border-surface-variant hover:bg-teal-50/60 transition" key={entry.id}><td className="px-4 py-3 font-medium">{entry.descricao}</td><td className="px-4 py-3 capitalize text-secondary">{entry.tipo === "despesa" ? "Despesa" : "Receita"}</td><td className="px-4 py-3"><StatusPill value={entry.status} /></td><td className="px-4 py-3 text-right font-semibold text-on-surface">{brl.format(entry.valor)}</td><td className="px-4 py-3 text-right"><button className="mr-2 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary transition" onClick={() => entry.tipo === "despesa" ? setExpense({ id: entry.id, descricao: entry.descricao, valor: entry.valor, categoria: entry.categoria ?? "", status: entry.status, data: entry.data ?? todayISO() }) : setPayment({ id: entry.id, descricao: entry.descricao, valor: entry.valor, status: entry.status, formaPagamento: entry.formaPagamento ?? "manual", data: entry.data ?? todayISO() })} type="button">Editar</button><button className="rounded-lg p-1.5 text-secondary hover:bg-red-50 hover:text-error transition" onClick={() => { if (confirmDangerAction(`Excluir ${entry.tipo === "despesa" ? "a despesa" : "o pagamento"} ${entry.descricao}?`)) entry.tipo === "despesa" ? void onDeleteExpense(entry.id) : void onDeletePayment(entry.id); }} type="button"><Trash2 className="h-4 w-4" /></button></td></tr>)}</RefinedTable>}
      </SectionCard>
        </>
      ) : (
        <ExportPage entries={entries} professionals={professionals} clinicaNome={clinicaNome} clinicaCnpj={clinicaCnpj} />
      )}
    </div>
  );
}
