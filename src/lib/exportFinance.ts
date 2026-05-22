/**
 * exportFinance.ts
 * Funções puras para exportação de dados financeiros.
 * Suporta CSV, XLSX (SheetJS) e PDF (window.print via CSS).
 */
import * as XLSX from "@e965/xlsx";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ExportRow {
  [key: string]: string | number | null | undefined;
}

export interface RevenueRow {
  data: string;
  paciente: string;
  profissional: string;
  servico: string;
  convenio: string;
  valor_cobrado: number;
  valor_recebido: number;
  forma_pagamento: string;
  status: string;
  observacao: string;
}

export interface ExpenseRow {
  data: string;
  categoria: string;
  descricao: string;
  fornecedor: string;
  valor: number;
  forma_pagamento: string;
  status: string;
  observacao: string;
}

export interface PDFReportData {
  clinicaNome: string;
  clinicaCnpj?: string;
  periodo: { inicio: string; fim: string };
  totalReceitas: number;
  totalDespesas: number;
  lucroBruto: number;
  receitasPorFonte: { fonte: string; valor: number }[];
  despesasPorCategoria: { categoria: string; valor: number }[];
}

export interface TabularPDFColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

export interface TabularPDFReportData {
  title: string;
  subtitle: string;
  clinicaNome: string;
  columns: TabularPDFColumn[];
  rows: ExportRow[];
  summary?: { label: string; value: string | number }[];
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

function rowsToCSV(rows: ExportRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (val: string | number | null | undefined): string => {
    const str = val == null ? "" : String(val);
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  return "\uFEFF" + lines.join("\r\n"); // BOM para Excel reconhecer UTF-8
}

export function exportCSV(rows: ExportRow[], filename: string): void {
  const csv = rowsToCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

// ─── XLSX ─────────────────────────────────────────────────────────────────────

export function exportXLSX(rows: ExportRow[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();

  // Auto-width das colunas
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? "").length)) + 2,
  }));
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── PDF (CSS Print) ──────────────────────────────────────────────────────────

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cellText(value: string | number | null | undefined): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return String(value ?? "");
}

export function openPDFReport(data: PDFReportData): void {
  const { clinicaNome, clinicaCnpj, periodo, totalReceitas, totalDespesas, lucroBruto, receitasPorFonte, despesasPorCategoria } = data;

  const receitasRows = receitasPorFonte
    .map((r) => `<tr><td>${escapeHtml(r.fonte)}</td><td style="text-align:right">${escapeHtml(brl.format(r.valor))}</td></tr>`)
    .join("");

  const despesasRows = despesasPorCategoria
    .map((d) => `<tr><td>${escapeHtml(d.categoria)}</td><td style="text-align:right">${escapeHtml(brl.format(d.valor))}</td></tr>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório Mensal — ${escapeHtml(clinicaNome)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 40px; }
    h1 { font-size: 20px; font-weight: 700; color: #0f766e; margin-bottom: 4px; }
    .subtitle { font-size: 11px; color: #64748b; margin-bottom: 24px; }
    .summary { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 24px; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .card-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
    .card-value { font-size: 22px; font-weight: 700; margin-top: 4px; }
    .green { color: #0f766e; }
    .red { color: #dc2626; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 13px; font-weight: 600; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; padding: 6px 8px; background: #f8fafc; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
    td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
    footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 20px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(clinicaNome)}</h1>
  <p class="subtitle">Relatório Contábil Mensal · Período: ${fmtDate(periodo.inicio)} a ${fmtDate(periodo.fim)}</p>

  <div class="summary">
    <div class="card">
      <p class="card-label">Total de Receitas</p>
      <p class="card-value green">${brl.format(totalReceitas)}</p>
    </div>
    <div class="card">
      <p class="card-label">Total de Despesas</p>
      <p class="card-value red">${brl.format(totalDespesas)}</p>
    </div>
    <div class="card">
      <p class="card-label">Lucro Bruto</p>
      <p class="card-value ${lucroBruto >= 0 ? "green" : "red"}">${brl.format(lucroBruto)}</p>
    </div>
  </div>

  <div class="section">
    <h2>Receitas por Fonte</h2>
    <table>
      <thead><tr><th>Fonte</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>${receitasRows || '<tr><td colspan="2">Sem receitas no período</td></tr>'}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Despesas por Categoria</h2>
    <table>
      <thead><tr><th>Categoria</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>${despesasRows || '<tr><td colspan="2">Sem despesas no período</td></tr>'}</tbody>
    </table>
  </div>

  <footer>
    <span>${escapeHtml(clinicaNome)}${clinicaCnpj ? ` · CNPJ/CPF: ${escapeHtml(clinicaCnpj)}` : ""}</span>
    <span>Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
  </footer>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export function openRowsPDFReport(data: TabularPDFReportData): boolean {
  const headerCells = data.columns
    .map((column) => `<th style="text-align:${column.align ?? "left"}">${escapeHtml(column.label)}</th>`)
    .join("");
  const bodyRows = data.rows
    .map((row) => {
      const cells = data.columns
        .map((column) => `<td style="text-align:${column.align ?? "left"}">${escapeHtml(cellText(row[column.key]))}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  const summary = data.summary?.length
    ? `<div class="summary">${data.summary.map((item) => `
        <div class="card">
          <p class="card-label">${escapeHtml(item.label)}</p>
          <p class="card-value">${escapeHtml(cellText(item.value))}</p>
        </div>
      `).join("")}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(data.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 36px; }
    h1 { font-size: 19px; font-weight: 700; color: #0f766e; margin-bottom: 4px; }
    .subtitle { font-size: 11px; color: #64748b; margin-bottom: 18px; }
    .summary { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 18px; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
    .card-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
    .card-value { font-size: 15px; font-weight: 700; margin-top: 3px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th { padding: 7px 8px; background: #f8fafc; color: #64748b; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e2e8f0; }
    td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; word-break: break-word; }
    footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; gap: 16px; }
    @media print {
      body { padding: 18px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(data.title)}</h1>
  <p class="subtitle">${escapeHtml(data.subtitle)}</p>
  ${summary}
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows || `<tr><td colspan="${data.columns.length}">Nenhum registro encontrado.</td></tr>`}</tbody>
  </table>
  <footer>
    <span>${escapeHtml(data.clinicaNome)}</span>
    <span>Gerado em ${new Date().toLocaleString("pt-BR")}</span>
  </footer>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  return true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildFilename(tipo: string, periodo: { inicio: string; fim: string }): string {
  const now = new Date().toISOString().slice(0, 10);
  return `clinicpro_${tipo}_${periodo.inicio}_${periodo.fim}_exportado_${now}`;
}
