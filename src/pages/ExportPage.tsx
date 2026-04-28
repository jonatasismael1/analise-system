/**
 * ExportPage.tsx
 * Página completa de exportação financeira para uso contábil.
 * Filtros, preview, CSV/XLSX/PDF, histórico de exportações.
 */
import { useState, useMemo, useEffect } from "react";
import {
  Download,
  FileText,
  Table2,
  Calendar,
  Filter,
  Eye,
  Clock,
  FileSpreadsheet,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import type { FinanceEntry, Professional } from "../types/clinic";
import {
  exportCSV,
  exportXLSX,
  openPDFReport,
  buildFilename,
  type RevenueRow,
  type ExpenseRow,
} from "../lib/exportFinance";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExportHistoryItem {
  id: string;
  tipo: string;
  formato: string;
  periodo: string;
  totalLinhas: number;
  criadoEm: string;
}

interface ExportPageProps {
  entries: FinanceEntry[];
  professionals: Professional[];
  clinicaNome: string;
  clinicaCnpj?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const HISTORY_KEY = "clinicpro_export_history";
const MAX_HISTORY = 10;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  csv: <FileText className="h-4 w-4" />,
  xlsx: <FileSpreadsheet className="h-4 w-4" />,
  pdf: <FileText className="h-4 w-4" />,
};

// ─── ExportPage ────────────────────────────────────────────────────────────────

export default function ExportPage({ entries, professionals, clinicaNome, clinicaCnpj }: ExportPageProps) {
  const [filters, setFilters] = useState({
    dataInicio: firstDayOfMonth(),
    dataFim: todayISO(),
    tipo: "ambos" as "receitas" | "despesas" | "ambos",
    profissionalId: "todos",
    convenio: "",
  });
  const [showPreview, setShowPreview] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const [history, setHistory] = useState<ExportHistoryItem[]>([]);

  // Carregar histórico do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw) as ExportHistoryItem[]);
    } catch {
      /* ignore */
    }
  }, []);

  // ─── Filtrar dados ────────────────────────────────────────────────────────────

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const entryDate = entry.data ?? "";
      const inPeriod =
        entryDate >= filters.dataInicio && entryDate <= filters.dataFim;
      const matchesTipo =
        filters.tipo === "ambos" ||
        (filters.tipo === "receitas" && entry.tipo !== "despesa") ||
        (filters.tipo === "despesas" && entry.tipo === "despesa");
      const matchesProfissional =
        filters.profissionalId === "todos" ||
        entry.profissionalId === filters.profissionalId;
      return inPeriod && matchesTipo && matchesProfissional;
    });
  }, [entries, filters]);

  // ─── Build rows ───────────────────────────────────────────────────────────────

  const revenueRows: RevenueRow[] = useMemo(() =>
    filteredEntries
      .filter((e) => e.tipo !== "despesa")
      .map((e) => ({
        data: e.data ?? "",
        paciente: "",
        profissional: professionals.find((p) => p.id === e.profissionalId)?.nome ?? "",
        servico: e.descricao,
        convenio: filters.convenio || "Particular",
        valor_cobrado: e.valor,
        valor_recebido: e.status === "pago" ? e.valor : 0,
        forma_pagamento: e.formaPagamento ?? "",
        status: e.status,
        observacao: "",
      })),
  [filteredEntries, professionals, filters.convenio]);

  const expenseRows: ExpenseRow[] = useMemo(() =>
    filteredEntries
      .filter((e) => e.tipo === "despesa")
      .map((e) => ({
        data: e.data ?? "",
        categoria: e.categoria ?? "Geral",
        descricao: e.descricao,
        fornecedor: "",
        valor: e.valor,
        forma_pagamento: e.formaPagamento ?? "",
        status: e.status,
        observacao: "",
      })),
  [filteredEntries]);

  const exportRows = useMemo(() => {
    if (filters.tipo === "receitas") return revenueRows as unknown as Record<string, string | number>[];
    if (filters.tipo === "despesas") return expenseRows as unknown as Record<string, string | number>[];
    return [
      ...revenueRows.map((r) => ({ ...r, _tipo: "Receita" })),
      ...expenseRows.map((e) => ({ ...e, _tipo: "Despesa" })),
    ] as Record<string, string | number>[];
  }, [filters.tipo, revenueRows, expenseRows]);

  // KPIs do período
  const kpis = useMemo(() => {
    const receitas = revenueRows.reduce((s, r) => s + r.valor_recebido, 0);
    const despesas = expenseRows.reduce((s, e) => s + (e.status === "pago" ? e.valor : 0), 0);
    return { receitas, despesas, lucro: receitas - despesas };
  }, [revenueRows, expenseRows]);

  // ─── Grupos para PDF ──────────────────────────────────────────────────────────

  const receitasPorFonte = useMemo(() => {
    const map: Record<string, number> = {};
    revenueRows.forEach((r) => {
      const fonte = r.convenio || "Particular";
      map[fonte] = (map[fonte] ?? 0) + r.valor_recebido;
    });
    return Object.entries(map).map(([fonte, valor]) => ({ fonte, valor }));
  }, [revenueRows]);

  const despesasPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    expenseRows.forEach((e) => {
      const cat = e.categoria || "Geral";
      map[cat] = (map[cat] ?? 0) + e.valor;
    });
    return Object.entries(map).map(([categoria, valor]) => ({ categoria, valor }));
  }, [expenseRows]);

  // ─── Exportar ─────────────────────────────────────────────────────────────────

  function saveHistory(formato: string) {
    const item: ExportHistoryItem = {
      id: crypto.randomUUID(),
      tipo: filters.tipo,
      formato,
      periodo: `${filters.dataInicio} → ${filters.dataFim}`,
      totalLinhas: exportRows.length,
      criadoEm: new Date().toISOString(),
    };
    const updated = [item, ...history].slice(0, MAX_HISTORY);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    setExported(formato);
    setTimeout(() => setExported(null), 3000);
  }

  function handleCSV() {
    exportCSV(exportRows, buildFilename(filters.tipo, { inicio: filters.dataInicio, fim: filters.dataFim }));
    saveHistory("csv");
  }

  function handleXLSX() {
    exportXLSX(exportRows, buildFilename(filters.tipo, { inicio: filters.dataInicio, fim: filters.dataFim }));
    saveHistory("xlsx");
  }

  function handlePDF() {
    openPDFReport({
      clinicaNome,
      clinicaCnpj,
      periodo: { inicio: filters.dataInicio, fim: filters.dataFim },
      totalReceitas: kpis.receitas,
      totalDespesas: kpis.despesas,
      lucroBruto: kpis.lucro,
      receitasPorFonte,
      despesasPorCategoria,
    });
    saveHistory("pdf");
  }

  // ─── UI ───────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface">Exportação Financeira</h2>
          <p className="mt-1 text-sm text-secondary">
            Exporte dados para contabilidade em CSV, Excel ou PDF.
          </p>
        </div>
        {exported && (
          <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-medium text-primary border border-teal-200">
            <CheckCircle2 className="h-4 w-4" />
            Exportado como {exported.toUpperCase()}!
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-surface-variant bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-on-surface">Filtros</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {/* Data Início */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.05em] text-secondary">
              Data Início
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
              <input
                className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                type="date"
                value={filters.dataInicio}
                onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
              />
            </div>
          </div>
          {/* Data Fim */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.05em] text-secondary">
              Data Fim
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
              <input
                className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                type="date"
                value={filters.dataFim}
                onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
              />
            </div>
          </div>
          {/* Tipo */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.05em] text-secondary">
              Tipo
            </label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border border-outline-variant bg-white py-2 pl-3 pr-8 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={filters.tipo}
                onChange={(e) => setFilters({ ...filters, tipo: e.target.value as "receitas" | "despesas" | "ambos" })}
              >
                <option value="ambos">Receitas + Despesas</option>
                <option value="receitas">Apenas Receitas</option>
                <option value="despesas">Apenas Despesas</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
            </div>
          </div>
          {/* Profissional */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.05em] text-secondary">
              Profissional
            </label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border border-outline-variant bg-white py-2 pl-3 pr-8 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={filters.profissionalId}
                onChange={(e) => setFilters({ ...filters, profissionalId: e.target.value })}
              >
                <option value="todos">Todos</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
            </div>
          </div>
        </div>
      </div>

      {/* KPIs do período */}
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: "Receitas no Período", value: brl.format(kpis.receitas), color: "text-primary" },
          { label: "Despesas no Período", value: brl.format(kpis.despesas), color: "text-error" },
          { label: "Lucro Bruto", value: brl.format(kpis.lucro), color: kpis.lucro >= 0 ? "text-primary" : "text-error" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-surface-variant bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
            <p className="mt-1 text-xs text-secondary">{exportRows.length} registros no filtro</p>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-surface-variant bg-white">
        <button
          className="flex w-full items-center justify-between p-4 text-left"
          onClick={() => setShowPreview((v) => !v)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <span className="font-semibold text-on-surface">Preview dos dados</span>
            <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs text-secondary">
              5 primeiros de {exportRows.length}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 text-secondary transition-transform ${showPreview ? "rotate-180" : ""}`} />
        </button>

        {showPreview && exportRows.length > 0 && (
          <div className="border-t border-surface-variant overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-container-low">
                  {Object.keys(exportRows[0]).map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold uppercase tracking-[0.05em] text-secondary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exportRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-surface-variant hover:bg-teal-50/50 transition">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="whitespace-nowrap px-3 py-2 text-on-surface">
                        {val == null ? "—" : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {exportRows.length === 0 && (
              <p className="p-6 text-center text-sm text-secondary">Nenhum dado no período selecionado.</p>
            )}
          </div>
        )}

        {showPreview && exportRows.length === 0 && (
          <div className="border-t border-surface-variant p-6 text-center">
            <p className="text-sm text-secondary">Nenhum registro encontrado com os filtros atuais.</p>
          </div>
        )}
      </div>

      {/* Botões de exportação */}
      <div className="rounded-xl border border-surface-variant bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-on-surface">Exportar</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            className="group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant p-5 transition hover:border-primary hover:bg-teal-50/30 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={exportRows.length === 0}
            onClick={handleCSV}
            type="button"
          >
            <div className="rounded-lg bg-surface-container p-2.5 group-hover:bg-primary/10 transition">
              <FileText className="h-6 w-6 text-secondary group-hover:text-primary transition" />
            </div>
            <span className="font-semibold text-on-surface">CSV</span>
            <span className="text-xs text-secondary text-center">Compatível com Excel,<br />Google Sheets e softwares contábeis</span>
          </button>

          <button
            className="group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant p-5 transition hover:border-primary hover:bg-teal-50/30 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={exportRows.length === 0}
            onClick={handleXLSX}
            type="button"
          >
            <div className="rounded-lg bg-surface-container p-2.5 group-hover:bg-primary/10 transition">
              <Table2 className="h-6 w-6 text-secondary group-hover:text-primary transition" />
            </div>
            <span className="font-semibold text-on-surface">Excel (.xlsx)</span>
            <span className="text-xs text-secondary text-center">Formatado com colunas<br />auto-dimensionadas</span>
          </button>

          <button
            className="group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-teal-50/20 p-5 transition hover:border-primary hover:bg-teal-50/50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handlePDF}
            type="button"
          >
            <div className="rounded-lg bg-primary/10 p-2.5 group-hover:bg-primary/20 transition">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <span className="font-semibold text-on-surface">PDF Contábil</span>
            <span className="text-xs text-secondary text-center">Relatório mensal formatado<br />para contador — abre para impressão</span>
          </button>
        </div>
      </div>

      {/* Histórico */}
      {history.length > 0 && (
        <div className="rounded-xl border border-surface-variant bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-on-surface">Histórico de Exportações</h3>
            <span className="text-xs text-secondary">(últimas {history.length})</span>
          </div>
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-surface-variant bg-surface-container-lowest px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-secondary">
                    {FORMAT_ICONS[item.formato] ?? <FileText className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">
                      {item.tipo === "ambos" ? "Receitas + Despesas" : item.tipo === "receitas" ? "Receitas" : "Despesas"}
                      {" · "}
                      <span className="uppercase text-primary">{item.formato}</span>
                    </p>
                    <p className="text-xs text-secondary">
                      {item.periodo} · {item.totalLinhas} linhas · {fmtDateTime(item.criadoEm)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            className="mt-3 text-xs text-secondary underline-offset-2 hover:text-primary hover:underline transition"
            onClick={() => {
              setHistory([]);
              localStorage.removeItem(HISTORY_KEY);
            }}
            type="button"
          >
            Limpar histórico
          </button>
        </div>
      )}
    </div>
  );
}
