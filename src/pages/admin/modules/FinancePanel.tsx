import { useMemo, useState } from "react";
import { Check, Copy, Trash2 } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
import { brl, todayISO } from "../../../lib/formatters";
import type { FinanceEntry, Professional, Service } from "../../../types/clinic";
import ExportPage from "../../ExportPage";
import { Field, inputClass } from "../components/Field";
import { RefinedTable } from "../components/RefinedTable";
import { StatusPill } from "../components/StatusPill";

type PaymentForm = {
  id: string;
  descricao: string;
  valor: number;
  status: FinanceEntry["status"];
  formaPagamento: string;
  data: string;
  profissionalId: string;
  servicoId: string;
};

type ExpenseForm = {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  status: FinanceEntry["status"];
  data: string;
};

function dateLabel(value?: string | null) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "-";
}

function decisionTone(percent: number): { tone: "success" | "warning" | "danger"; label: string } {
  if (percent >= 100) return { tone: "success", label: "Meta atingida" };
  if (percent >= 70) return { tone: "warning", label: "Atenção" };
  return { tone: "danger", label: "Alerta" };
}

export function FinancePanel({
  entries,
  kpis,
  onPayment,
  onExpense,
  onUpdatePayment,
  onUpdateExpense,
  onDeletePayment,
  onDeleteExpense,
  professionals,
  services,
  clinicaNome,
  clinicaCnpj
}: {
  readonly entries: FinanceEntry[];
  readonly kpis: { revenue: number; expenses: number; profit: number; overdue: number; forecast: number };
  readonly onPayment: (values: { valor: number; status: FinanceEntry["status"]; formaPagamento?: string; data?: string | null; descricao?: string; profissionalId?: string | null; servicoId?: string | null }) => Promise<void>;
  readonly onExpense: (values: { descricao: string; categoria?: string; valor: number; status: FinanceEntry["status"]; data?: string | null }) => Promise<void>;
  readonly onUpdatePayment: (id: string, values: { valor: number; status: FinanceEntry["status"]; formaPagamento?: string | null; data?: string | null; descricao?: string; profissionalId?: string | null; servicoId?: string | null }) => Promise<void>;
  readonly onUpdateExpense: (id: string, values: { descricao: string; categoria?: string | null; valor: number; status: FinanceEntry["status"]; data?: string | null }) => Promise<void>;
  readonly onDeletePayment: (id: string) => Promise<void>;
  readonly onDeleteExpense: (id: string) => Promise<void>;
  readonly professionals: Professional[];
  readonly services: Service[];
  readonly clinicaNome: string;
  readonly clinicaCnpj?: string;
}) {
  const [activeTab, setActiveTab] = useState<"lancamentos" | "exportar">("lancamentos");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentForm>({ id: "", descricao: "", valor: 180, status: "pago", formaPagamento: "manual", data: todayISO(), profissionalId: "", servicoId: "" });
  const [expense, setExpense] = useState<ExpenseForm>({ id: "", descricao: "", valor: 90, categoria: "Operacional", status: "pendente", data: todayISO() });
  const [filters, setFilters] = useState({ search: "", status: "todos", tipo: "todos" });

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.descricao.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "todos" || entry.status === filters.status;
    const matchesType = filters.tipo === "todos" || (entry.tipo ?? "pagamento") === filters.tipo;
    return matchesSearch && matchesStatus && matchesType;
  });

  const decision = useMemo(() => {
    const payments = entries.filter((entry) => entry.tipo !== "despesa");
    const realized = payments.filter((entry) => entry.status === "pago").reduce((sum, entry) => sum + entry.valor, 0);
    const forecast = payments.filter((entry) => entry.status !== "cancelado").reduce((sum, entry) => sum + entry.valor, 0);
    const expenses = entries.filter((entry) => entry.tipo === "despesa" && entry.status !== "cancelado").reduce((sum, entry) => sum + entry.valor, 0);
    const overdue = entries.filter((entry) => entry.status === "atrasado").reduce((sum, entry) => sum + entry.valor, 0);
    const percent = forecast > 0 ? Math.round((realized / forecast) * 100) : 100;
    const byProfessional = professionals.map((professional) => {
      const professionalEntries = payments.filter((entry) => entry.profissionalId === professional.id);
      return {
        id: professional.id,
        nome: professional.nome,
        paid: professionalEntries.filter((entry) => entry.status === "pago").reduce((sum, entry) => sum + entry.valor, 0),
        forecast: professionalEntries.filter((entry) => entry.status !== "cancelado").reduce((sum, entry) => sum + entry.valor, 0),
        overdue: professionalEntries.filter((entry) => entry.status === "atrasado").reduce((sum, entry) => sum + entry.valor, 0)
      };
    }).filter((item) => item.forecast > 0 || item.paid > 0 || item.overdue > 0);
    const byService = services.map((service) => {
      const serviceEntries = payments.filter((entry) => entry.servicoId === service.id);
      return {
        id: service.id,
        nome: service.nome,
        revenue: serviceEntries.filter((entry) => entry.status === "pago").reduce((sum, entry) => sum + entry.valor, 0),
        overdue: serviceEntries.filter((entry) => entry.status === "atrasado").reduce((sum, entry) => sum + entry.valor, 0)
      };
    }).filter((item) => item.revenue > 0 || item.overdue > 0);
    return {
      realized,
      forecast,
      expenses,
      overdue,
      profit: realized - expenses,
      predictedBalance: forecast - expenses,
      percent,
      difference: forecast - realized,
      tone: decisionTone(percent),
      byProfessional,
      byService,
      overdueEntries: entries.filter((entry) => entry.status === "atrasado")
    };
  }, [entries, professionals, services]);

  function resetPayment() {
    setPayment({ id: "", descricao: "", valor: 180, status: "pago", formaPagamento: "manual", data: todayISO(), profissionalId: "", servicoId: "" });
  }

  function resetExpense() {
    setExpense({ id: "", descricao: "", valor: 90, categoria: "Operacional", status: "pendente", data: todayISO() });
  }

  return (
    <div className="space-y-5">
      <div className="flex border-b border-surface-variant">
        <button className={`px-4 py-3 text-sm font-medium ${activeTab === "lancamentos" ? "border-b-2 border-primary text-primary" : "text-secondary hover:text-on-surface"}`} onClick={() => setActiveTab("lancamentos")} type="button">
          Lançamentos
        </button>
        <button className={`px-4 py-3 text-sm font-medium ${activeTab === "exportar" ? "border-b-2 border-primary text-primary" : "text-secondary hover:text-on-surface"}`} onClick={() => setActiveTab("exportar")} type="button">
          Exportar
        </button>
      </div>

      {activeTab === "lancamentos" ? (
        <>
          <section className="grid gap-4 md:grid-cols-5">
            {[
              { label: "Receita realizada", value: decision.realized },
              { label: "Receita prevista", value: decision.forecast },
              { label: "Despesas", value: decision.expenses },
              { label: "Lucro", value: decision.profit },
              { label: "Atraso", value: decision.overdue }
            ].map(({ label, value }) => (
              <div className="rounded-lg border border-surface-variant bg-white p-4 transition hover:shadow-clinical" key={label}>
                <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">{label}</p>
                <p className={`mt-2 text-xl font-bold ${label === "Atraso" && value > 0 ? "text-error" : value >= 0 ? "text-on-surface" : "text-error"}`}>{brl.format(value)}</p>
              </div>
            ))}
          </section>

          <SectionCard title="Fluxo de caixa" description="Visão rápida para decidir o que cobrar, conter ou reforçar.">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-lg border border-surface-variant bg-surface-container-lowest p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Previsto vs realizado</p>
                    <p className="mt-1 text-sm text-secondary">{decision.percent}% realizado. Diferença de {brl.format(decision.difference)}.</p>
                  </div>
                  <StatusBadge tone={decision.tone.tone}>{decision.tone.label}</StatusBadge>
                </div>
                <div className="mt-4 h-2 rounded-full bg-surface-container">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(decision.percent, 100)}%` }} />
                </div>
              </div>
              <div className="rounded-lg border border-surface-variant bg-surface-container-lowest p-4">
                <p className="text-sm font-semibold text-on-surface">Saldo previsto</p>
                <p className="mt-1 text-2xl font-bold text-primary">{brl.format(decision.predictedBalance)}</p>
                <p className="mt-1 text-sm text-secondary">Previsto menos despesas registradas.</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Financeiro">
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <Field label="Buscar"><input className={inputClass()} placeholder="Descrição" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></Field>
              <Field label="Status"><select className={inputClass()} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="todos">Todos</option><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option><option value="cancelado">Cancelado</option></select></Field>
              <Field label="Tipo"><select className={inputClass()} value={filters.tipo} onChange={(event) => setFilters({ ...filters, tipo: event.target.value })}><option value="todos">Todos</option><option value="pagamento">Pagamentos</option><option value="despesa">Despesas</option></select></Field>
            </div>
            <div className="mb-5 grid gap-3 md:grid-cols-2">
              <form className="rounded-lg border border-surface-variant p-3" onSubmit={(event) => { event.preventDefault(); const payload = { ...payment, profissionalId: payment.profissionalId || null, servicoId: payment.servicoId || null }; payment.id ? void onUpdatePayment(payment.id, payload) : void onPayment(payload); resetPayment(); }}>
                <Field label="Descrição"><input className={inputClass()} placeholder="Ex: Consulta paga" value={payment.descricao} onChange={(event) => setPayment({ ...payment, descricao: event.target.value })} required /></Field>
                <Field label="Valor da receita"><input className={inputClass()} min={0.01} step="0.01" type="number" value={payment.valor} onChange={(event) => setPayment({ ...payment, valor: Number(event.target.value) })} /></Field>
                <Field label="Status"><select className={inputClass()} value={payment.status} onChange={(event) => setPayment({ ...payment, status: event.target.value as FinanceEntry["status"] })}><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option><option value="cancelado">Cancelado</option></select></Field>
                <Field label="Profissional"><select className={inputClass()} value={payment.profissionalId} onChange={(event) => setPayment({ ...payment, profissionalId: event.target.value })}><option value="">Não vincular</option>{professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
                <Field label="Serviço"><select className={inputClass()} value={payment.servicoId} onChange={(event) => setPayment({ ...payment, servicoId: event.target.value })}><option value="">Não vincular</option>{services.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
                <button className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm text-white" type="submit">{payment.id ? "Atualizar pagamento" : "Criar pagamento"}</button>
              </form>
              <form className="rounded-lg border border-surface-variant p-3" onSubmit={(event) => { event.preventDefault(); expense.id ? void onUpdateExpense(expense.id, expense) : void onExpense(expense); resetExpense(); }}>
                <Field label="Despesa"><input className={inputClass()} value={expense.descricao} onChange={(event) => setExpense({ ...expense, descricao: event.target.value })} required /></Field>
                <Field label="Valor"><input className={inputClass()} min={0.01} step="0.01" type="number" value={expense.valor} onChange={(event) => setExpense({ ...expense, valor: Number(event.target.value) })} /></Field>
                <Field label="Status"><select className={inputClass()} value={expense.status} onChange={(event) => setExpense({ ...expense, status: event.target.value as FinanceEntry["status"] })}><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option><option value="cancelado">Cancelado</option></select></Field>
                <button className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm text-white" type="submit">{expense.id ? "Atualizar despesa" : "Criar despesa"}</button>
              </form>
            </div>
            {filteredEntries.length === 0 ? <EmptyState title="Nenhum lançamento" message="Você ainda não possui lançamentos financeiros." /> : <RefinedTable headers={["Descrição", "Tipo", "Status", "Valor", "Ações"]}>{filteredEntries.map((entry) => <tr className="border-b border-surface-variant hover:bg-teal-50/60 transition" key={entry.id}><td className="px-4 py-3 font-medium">{entry.descricao}</td><td className="px-4 py-3 capitalize text-secondary">{entry.tipo === "despesa" ? "Despesa" : "Receita"}</td><td className="px-4 py-3"><StatusPill value={entry.status} /></td><td className="px-4 py-3 text-right font-semibold text-on-surface">{brl.format(entry.valor)}</td><td className="px-4 py-3 text-right"><button className="mr-2 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary transition" onClick={() => entry.tipo === "despesa" ? setExpense({ id: entry.id, descricao: entry.descricao, valor: entry.valor, categoria: entry.categoria ?? "", status: entry.status, data: entry.data ?? todayISO() }) : setPayment({ id: entry.id, descricao: entry.descricao, valor: entry.valor, status: entry.status, formaPagamento: entry.formaPagamento ?? "manual", data: entry.data ?? todayISO(), profissionalId: entry.profissionalId ?? "", servicoId: entry.servicoId ?? "" })} type="button">Editar</button><button aria-label={`Excluir lançamento ${entry.descricao}`} className="rounded-lg p-1.5 text-secondary hover:bg-red-50 hover:text-error transition" onClick={() => { if (confirmDangerAction(`Tem certeza que deseja excluir este lançamento financeiro ${entry.descricao}? Essa ação não pode ser desfeita.`)) entry.tipo === "despesa" ? void onDeleteExpense(entry.id) : void onDeletePayment(entry.id); }} type="button"><Trash2 className="h-4 w-4" /></button></td></tr>)}</RefinedTable>}
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Receita por profissional">
              {decision.byProfessional.length === 0 ? <EmptyState title="Sem receita vinculada" message="Vincule receitas a profissionais para acompanhar desempenho." /> : (
                <div className="space-y-3">{decision.byProfessional.map((item) => <div className="rounded-lg border border-surface-variant p-3" key={item.id}><div className="flex items-center justify-between gap-3"><p className="font-semibold">{item.nome}</p><StatusBadge tone={item.overdue > 0 ? "danger" : "success"}>{item.overdue > 0 ? `Atraso ${brl.format(item.overdue)}` : "Em dia"}</StatusBadge></div><p className="mt-2 text-sm text-secondary">Pago: {brl.format(item.paid)} · Previsto: {brl.format(item.forecast)}</p></div>)}</div>
              )}
            </SectionCard>

            <SectionCard title="Receita por serviço">
              {decision.byService.length === 0 ? <EmptyState title="Sem receita por serviço" message="Vincule receitas a serviços para entender o que mais gera caixa." /> : (
                <div className="space-y-3">{decision.byService.map((item) => <div className="rounded-lg border border-surface-variant p-3" key={item.id}><div className="flex items-center justify-between gap-3"><p className="font-semibold">{item.nome}</p><span className="font-semibold">{brl.format(item.revenue)}</span></div><p className="mt-1 text-sm text-secondary">Atraso: {brl.format(item.overdue)}</p></div>)}</div>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Inadimplência" description="Copie uma cobrança objetiva para WhatsApp ou atendimento.">
            {decision.overdueEntries.length === 0 ? <EmptyState title="Nenhuma pendência" message="Você ainda não possui cobranças em atraso." /> : (
              <div className="space-y-3">
                {decision.overdueEntries.map((entry) => {
                  const message = `Olá! Identificamos uma pendência de ${brl.format(entry.valor)} referente a ${entry.descricao}. Podemos ajudar com a regularização?`;
                  return (
                    <div className="flex flex-col justify-between gap-3 rounded-lg border border-surface-variant p-3 md:flex-row md:items-center" key={entry.id}>
                      <div>
                        <p className="font-semibold">{entry.descricao}</p>
                        <p className="text-sm text-secondary">{brl.format(entry.valor)} · {dateLabel(entry.data)}</p>
                      </div>
                      <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium hover:border-primary hover:text-primary" onClick={() => { void navigator.clipboard.writeText(message); setCopiedId(entry.id); }} type="button">
                        {copiedId === entry.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedId === entry.id ? "Copiado" : "Copiar cobrança"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </>
      ) : (
        <ExportPage entries={entries} professionals={professionals} clinicaNome={clinicaNome} clinicaCnpj={clinicaCnpj} />
      )}
    </div>
  );
}
