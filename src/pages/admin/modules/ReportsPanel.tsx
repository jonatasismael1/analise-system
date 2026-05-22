import { useMemo, useState } from "react";
import { Calendar, Download, FileText, Users } from "lucide-react";
import { SectionCard } from "../../../components/ui/SectionCard";
import { exportCSV, openRowsPDFReport, type ExportRow, type TabularPDFColumn } from "../../../lib/exportFinance";
import { brl, monthBounds } from "../../../lib/formatters";
import { toast } from "../../../lib/toast";
import type { Appointment, FinanceEntry, Patient, Professional, Service } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";
import { RefinedTable } from "../components/RefinedTable";

type ReportKind = "financeiro" | "agenda" | "pacientes";

const reportOptions: Array<{ key: ReportKind; label: string; description: string }> = [
  { key: "financeiro", label: "Financeiro", description: "Receitas, despesas, status e vínculo operacional." },
  { key: "agenda", label: "Agenda", description: "Atendimentos por período, profissional e status." },
  { key: "pacientes", label: "Pacientes", description: "Cadastro ativo para análise administrativa." }
];

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

function dateLabel(value?: string | null) {
  return value ? dateFormatter.format(new Date(`${value}T12:00:00Z`)) : "-";
}

function slug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase();
}

function reportFilename(kind: ReportKind, start: string, end: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `clinicpro_${kind}_${start}_${end}_${today}`;
}

function rowsForFinance(entries: FinanceEntry[], patients: Patient[], professionals: Professional[], services: Service[], start: string, end: string): ExportRow[] {
  const patientsById = new Map(patients.map((patient) => [patient.id, patient.nome]));
  const professionalsById = new Map(professionals.map((professional) => [professional.id, professional.nome]));
  const servicesById = new Map(services.map((service) => [service.id, service.nome]));

  return entries
    .filter((entry) => {
      const date = entry.data ?? "";
      return date >= start && date <= end;
    })
    .sort((a, b) => `${a.data ?? ""}${a.descricao}`.localeCompare(`${b.data ?? ""}${b.descricao}`))
    .map((entry) => ({
      Data: dateLabel(entry.data),
      Tipo: entry.tipo === "despesa" ? "Despesa" : "Receita",
      Status: entry.status,
      Descricao: entry.descricao,
      Paciente: entry.pacienteId ? patientsById.get(entry.pacienteId) ?? "" : "",
      Profissional: entry.profissionalId ? professionalsById.get(entry.profissionalId) ?? "" : "",
      Servico: entry.servicoId ? servicesById.get(entry.servicoId) ?? "" : "",
      "Forma de pagamento": entry.formaPagamento ?? "",
      Categoria: entry.categoria ?? "",
      Valor: entry.valor
    }));
}

function rowsForAgenda(appointments: Appointment[], start: string, end: string): ExportRow[] {
  return appointments
    .filter((appointment) => appointment.data >= start && appointment.data <= end)
    .sort((a, b) => `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`))
    .map((appointment) => ({
      Data: dateLabel(appointment.data),
      Horario: appointment.horario,
      Paciente: appointment.pacienteNome,
      WhatsApp: appointment.pacienteWhatsapp ?? "",
      Profissional: appointment.profissional,
      Servico: appointment.servico,
      Status: appointment.status
    }));
}

function rowsForPatients(patients: Patient[], professionals: Professional[]): ExportRow[] {
  const professionalsById = new Map(professionals.map((professional) => [professional.id, professional.nome]));

  return [...patients]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
    .map((patient) => ({
      Nome: patient.nome,
      CPF: patient.cpf ?? "",
      WhatsApp: patient.whatsapp,
      Email: patient.email ?? "",
      Status: patient.status,
      Profissional: patient.profissionalId ? professionalsById.get(patient.profissionalId) ?? "" : "",
      "Ultimo atendimento": dateLabel(patient.ultimoAtendimento),
      "Proximo retorno": dateLabel(patient.proximoRetorno),
      "Total gasto": patient.valorTotalGasto
    }));
}

function columnsFor(rows: ExportRow[]): TabularPDFColumn[] {
  return Object.keys(rows[0] ?? {}).map((key) => ({
    key,
    label: key,
    align: ["Valor", "Total gasto"].includes(key) ? "right" : "left"
  }));
}

export function ReportsPanel({ appointments, patients, professionals, services, entries, clinicaNome }: { readonly appointments: Appointment[]; readonly patients: Patient[]; readonly professionals: Professional[]; readonly services: Service[]; readonly entries: FinanceEntry[]; readonly clinicaNome: string }) {
  const currentMonth = useMemo(() => monthBounds(), []);
  const [reportKind, setReportKind] = useState<ReportKind>("financeiro");
  const [filters, setFilters] = useState({ start: currentMonth.start, end: currentMonth.end });

  const paid = entries.filter((entry) => entry.tipo !== "despesa" && entry.status === "pago").reduce((sum, entry) => sum + entry.valor, 0);
  const missed = appointments.filter((item) => item.status === "faltou").length;
  const ticket = appointments.length ? paid / appointments.length : 0;
  const metrics = [
    ["Ocupação Média", `${Math.round((appointments.length / Math.max(professionals.length * 40, 1)) * 100)}%`],
    ["Faturamento", brl.format(paid)],
    ["Ticket Médio", brl.format(ticket)],
    ["Taxa de Faltas", `${Math.round((missed / Math.max(appointments.length, 1)) * 100)}%`],
    ["Pacientes Ativos", patients.filter((item) => item.status === "ativo").length],
    ["Serviços Cadastrados", services.length]
  ];

  const reportRows = useMemo(() => {
    if (reportKind === "agenda") return rowsForAgenda(appointments, filters.start, filters.end);
    if (reportKind === "pacientes") return rowsForPatients(patients, professionals);
    return rowsForFinance(entries, patients, professionals, services, filters.start, filters.end);
  }, [appointments, entries, filters.end, filters.start, patients, professionals, reportKind, services]);

  const reportSummary = useMemo(() => {
    if (reportKind === "financeiro") {
      const revenue = reportRows.filter((row) => row.Tipo === "Receita").reduce((sum, row) => sum + Number(row.Valor ?? 0), 0);
      const expenses = reportRows.filter((row) => row.Tipo === "Despesa").reduce((sum, row) => sum + Number(row.Valor ?? 0), 0);
      return [
        { label: "Receitas", value: brl.format(revenue) },
        { label: "Despesas", value: brl.format(expenses) },
        { label: "Saldo", value: brl.format(revenue - expenses) }
      ];
    }
    if (reportKind === "agenda") {
      const completed = reportRows.filter((row) => row.Status === "concluido").length;
      const canceled = reportRows.filter((row) => row.Status === "cancelado").length;
      return [
        { label: "Agendamentos", value: reportRows.length },
        { label: "Concluídos", value: completed },
        { label: "Cancelados", value: canceled }
      ];
    }
    return [
      { label: "Pacientes", value: reportRows.length },
      { label: "Ativos", value: patients.filter((patient) => patient.status === "ativo").length },
      { label: "Retornos pendentes", value: patients.filter((patient) => patient.status === "retorno_pendente").length }
    ];
  }, [patients, reportKind, reportRows]);

  const selectedReport = reportOptions.find((option) => option.key === reportKind) ?? reportOptions[0];
  const periodLabel = reportKind === "pacientes" ? "Cadastro completo" : `${dateLabel(filters.start)} a ${dateLabel(filters.end)}`;

  function handleCSV() {
    if (reportRows.length === 0) {
      toast.warning("Não há registros para exportar com os filtros atuais.");
      return;
    }
    exportCSV(reportRows, reportFilename(reportKind, filters.start, filters.end));
    toast.success(`Relatório ${selectedReport.label.toLowerCase()} exportado em CSV.`);
  }

  function handlePDF() {
    const opened = openRowsPDFReport({
      title: `Relatório de ${selectedReport.label}`,
      subtitle: `${periodLabel} · ${reportRows.length} registros`,
      clinicaNome,
      columns: columnsFor(reportRows),
      rows: reportRows,
      summary: reportSummary
    });
    if (!opened) toast.warning("Habilite pop-ups para gerar o PDF.");
    else toast.success(`Relatório ${selectedReport.label.toLowerCase()} aberto para PDF.`);
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Relatórios" description="KPIs calculados a partir de agendamentos, pagamentos, pacientes, profissionais e serviços.">
        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map(([label, value]) => (
            <div className="rounded-lg border border-surface-variant bg-white p-5 transition hover:shadow-clinical" key={label as string}>
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">{label}</p>
              <p className="mt-2 text-2xl font-bold text-on-surface">{value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Exportações" description="Gere arquivos CSV ou PDF de financeiro, agenda e pacientes com os dados já filtrados pelo perfil de acesso.">
        <div className="flex flex-col gap-4">
          <div className="grid gap-2 md:grid-cols-3">
            {reportOptions.map((option) => (
              <button
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  reportKind === option.key
                    ? "border-primary bg-primary-soft text-primary-dark"
                    : "border-outline-variant bg-white text-on-surface hover:border-primary"
                }`}
                key={option.key}
                onClick={() => setReportKind(option.key)}
                type="button"
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs text-secondary">{option.description}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Início">
                <input
                  className={inputClass()}
                  disabled={reportKind === "pacientes"}
                  type="date"
                  value={filters.start}
                  onChange={(event) => setFilters((current) => ({ ...current, start: event.target.value }))}
                />
              </Field>
              <Field label="Fim">
                <input
                  className={inputClass()}
                  disabled={reportKind === "pacientes"}
                  type="date"
                  value={filters.end}
                  onChange={(event) => setFilters((current) => ({ ...current, end: event.target.value }))}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 text-sm font-medium text-secondary transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={reportRows.length === 0}
                onClick={handleCSV}
                type="button"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                disabled={reportRows.length === 0}
                onClick={handlePDF}
                type="button"
              >
                <FileText className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {reportSummary.map((item) => (
              <div className="rounded-lg border border-surface-variant bg-surface-container-lowest p-4" key={item.label}>
                <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">{item.label}</p>
                <p className="mt-1 text-xl font-bold text-on-surface">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-surface-variant">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-variant bg-surface-container-lowest px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                {reportKind === "pacientes" ? <Users className="h-4 w-4 text-primary" /> : <Calendar className="h-4 w-4 text-primary" />}
                Preview: {selectedReport.label}
              </div>
              <span className="text-xs text-secondary">{periodLabel} · {reportRows.length} registros</span>
            </div>
            {reportRows.length > 0 ? (
              <RefinedTable headers={Object.keys(reportRows[0]).slice(0, 6)}>
                {reportRows.slice(0, 8).map((row, index) => (
                  <tr className="border-b border-surface-variant hover:bg-teal-50/60 transition" key={`${slug(selectedReport.label)}-${index}`}>
                    {Object.values(row).slice(0, 6).map((value, cellIndex) => (
                      <td className="px-4 py-3 text-sm text-on-surface" key={cellIndex}>
                        {String(value ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </RefinedTable>
            ) : (
              <p className="p-5 text-sm text-secondary">Nenhum registro encontrado para os filtros atuais.</p>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
