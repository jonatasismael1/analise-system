import { useMemo, useState } from "react";
import { Calendar, ChevronRight, Download, Loader2, MapPin, MessageCircle, Plus, Send, Trash2, Upload, User, X } from "lucide-react";
import { ProntuarioTimeline } from "../../../components/Prontuario/ProntuarioTimeline";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
import { brl } from "../../../lib/formatters";
import {
  DEFAULT_INSTANCE_NAME,
  sendWhatsAppText
} from "../../../services/quickActionService";
import type { Patient, Professional, UserRole } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";
import { Pagination, usePagination } from "../components/Pagination";
import { RefinedTable } from "../components/RefinedTable";
import { StatusPill } from "../components/StatusPill";

const KANBAN_LABEL: Record<string, string> = {
  novo: "Novo",
  agendado: "Agendado",
  atendido: "Atendido",
  retorno: "Retorno",
  faltou: "Faltou",
  inativo: "Inativo"
};

type PatientForm = Patient & {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  cep: string;
  referencia: string;
};

function blankPatient(professionalId?: string | null): PatientForm {
  return {
    id: "",
    nome: "",
    whatsapp: "",
    email: "",
    cpf: "",
    dataNascimento: "",
    endereco: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    cep: "",
    referencia: "",
    status: "ativo",
    valorTotalGasto: 0,
    profissionalId: professionalId ?? null,
    observacoes: ""
  };
}

function formFromPatient(patient: Patient): PatientForm {
  return {
    ...blankPatient(patient.profissionalId),
    ...patient,
    rua: patient.endereco ?? "",
    numero: "",
    bairro: "",
    cidade: "",
    cep: "",
    referencia: ""
  };
}

function buildAddress(form: PatientForm) {
  const parts = [
    form.rua.trim(),
    form.numero.trim() ? `nº ${form.numero.trim()}` : "",
    form.bairro.trim(),
    form.cidade.trim(),
    form.cep.trim() ? `CEP ${form.cep.trim()}` : "",
    form.referencia.trim() ? `Ref.: ${form.referencia.trim()}` : ""
  ].filter(Boolean);
  return parts.join(", ") || null;
}

function patientPayload(form: PatientForm): Patient {
  return {
    id: form.id,
    nome: form.nome,
    whatsapp: form.whatsapp,
    email: form.email || null,
    cpf: form.cpf || null,
    dataNascimento: form.dataNascimento || null,
    endereco: buildAddress(form),
    status: form.status,
    valorTotalGasto: Number(form.valorTotalGasto) || 0,
    profissionalId: form.profissionalId || null,
    ultimoAtendimento: form.ultimoAtendimento ?? null,
    proximoRetorno: form.proximoRetorno ?? null,
    kanbanStage: form.kanbanStage ?? null,
    observacoes: form.observacoes || null
  };
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadPatientsCsv(patients: Patient[]) {
  const header = ["Nome", "CPF", "WhatsApp", "Email", "Nascimento", "Endereco", "Status", "Observacoes", "Total gasto"];
  const rows = patients.map((patient) => [
    patient.nome,
    patient.cpf,
    patient.whatsapp,
    patient.email,
    patient.dataNascimento,
    patient.endereco,
    patient.status,
    patient.observacoes,
    patient.valorTotalGasto
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pacientes-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function PatientsPanel({
  clinicId,
  patients,
  professionals,
  onSave,
  onDelete,
  onImportMassively,
  onAnonymize,
  role
}: {
  readonly clinicId: string;
  readonly patients: Patient[];
  readonly professionals: Professional[];
  readonly onSave: (values: Patient) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
  readonly onImportMassively: (patients: Omit<Patient, "id" | "clinicaId">[]) => Promise<void>;
  readonly onAnonymize?: (id: string) => Promise<void>;
  readonly role?: UserRole;
}) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [detailPatient, setDetailPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState<PatientForm>(() => blankPatient(professionals[0]?.id ?? null));
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [filters, setFilters] = useState({ search: "", status: "todos", professionalId: "todos" });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  function updateFilter(next: Partial<typeof filters>) {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(0);
  }
  const [msgPatient, setMsgPatient] = useState<Patient | null>(null);
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgFeedback, setMsgFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const readonly = role === "profissional";
  const filteredPatients = useMemo(() => patients
    .filter((patient) => {
      const matchesSearch = `${patient.nome} ${patient.whatsapp} ${patient.email ?? ""} ${patient.cpf ?? ""}`.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = filters.status === "todos" || patient.status === filters.status;
      const matchesProfessional = filters.professionalId === "todos" || patient.profissionalId === filters.professionalId;
      return matchesSearch && matchesStatus && matchesProfessional;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })), [filters, patients]);

  const paginatedPatients = usePagination(filteredPatients, page, pageSize);

  function openCreateModal() {
    setForm(blankPatient(professionals[0]?.id ?? null));
    setIsPatientModalOpen(true);
  }

  function openEditModal(patient: Patient) {
    setForm(formFromPatient(patient));
    setIsPatientModalOpen(true);
  }

  async function handleSendMsg() {
    if (!msgPatient || !msgText.trim()) return;
    setSendingMsg(true);
    setMsgFeedback(null);
    try {
      const phone = msgPatient.whatsapp.replace(/\D/g, "");
      const normalized = phone.startsWith("55") ? phone : `55${phone}`;
      await sendWhatsAppText(DEFAULT_INSTANCE_NAME, normalized, msgText.trim());
      setMsgFeedback({ ok: true, text: "Mensagem enviada com sucesso!" });
      setMsgText("");
    } catch (e) {
      setMsgFeedback({ ok: false, text: e instanceof Error ? e.message : "Erro ao enviar mensagem." });
    } finally {
      setSendingMsg(false);
    }
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const parsed = lines.slice(1).map((line) => {
      const cols = line.split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, ""));
      return {
        nome: cols[0] || "Sem Nome",
        cpf: cols[1] || null,
        whatsapp: cols[2] || "00000000000",
        dataNascimento: cols[3] || null,
        endereco: [cols[4], cols[5] ? `CEP ${cols[5]}` : ""].filter(Boolean).join(", "),
        email: cols[6] || null,
        status: "ativo" as const,
        valorTotalGasto: 0,
        profissionalId: null,
        observacoes: "Importado em massa"
      };
    });
    if (parsed.length > 0 && await confirmDangerAction(`Tem certeza que deseja importar ${parsed.length} pacientes? Essa ação não pode ser desfeita automaticamente.`)) {
      await onImportMassively(parsed);
    }
  }

  if (selectedPatient) {
    return (
      <div className="space-y-4">
        <button
          className="text-sm text-secondary transition hover:text-primary"
          onClick={() => setSelectedPatient(null)}
          type="button"
        >
          ← Voltar para lista de pacientes
        </button>
        <ProntuarioTimeline
          clinicId={clinicId}
          patient={selectedPatient}
          professionals={professionals}
        />
      </div>
    );
  }

  return (
    <SectionCard
      title="Pacientes"
      description={readonly ? "Lista de pacientes sob seus cuidados." : "Lista em ordem alfabética. Use filtros, importe ou exporte CSV."}
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-3">
          <Field label="Buscar paciente">
            <input className={inputClass()} placeholder="Nome, WhatsApp, e-mail ou CPF" value={filters.search} onChange={(e) => updateFilter({ search: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className={inputClass()} value={filters.status} onChange={(e) => updateFilter({ status: e.target.value })}>
              <option value="todos">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="retorno_pendente">Retorno pendente</option>
              <option value="inativo">Inativo</option>
            </select>
          </Field>
          {!readonly ? (
            <Field label="Profissional">
              <select className={inputClass()} value={filters.professionalId} onChange={(e) => updateFilter({ professionalId: e.target.value })}>
                <option value="todos">Todos</option>
                {professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}
              </select>
            </Field>
          ) : null}
        </div>

        {!readonly ? (
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition hover:bg-primary-dark" onClick={openCreateModal} type="button">
              <Plus className="h-4 w-4" />
              Novo paciente
            </button>
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary bg-primary-soft px-4 text-sm font-medium text-primary-dark transition hover:bg-primary/20">
              <Upload className="h-4 w-4" />
              Importar CSV
              <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await importCsv(file);
                e.target.value = "";
              }} />
            </label>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 text-sm font-medium text-secondary transition hover:border-primary hover:text-primary" onClick={() => downloadPatientsCsv(filteredPatients)} type="button">
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          </div>
        ) : null}
      </div>

      {filteredPatients.length === 0 ? (
        <EmptyState title="Nenhum paciente" message="Nenhum paciente encontrado para os filtros aplicados." />
      ) : (
        <RefinedTable headers={readonly
          ? ["Nome", "Status", "Fase", ""]
          : ["Nome", "CPF", "Status", ""]
        }>
          {paginatedPatients.items.map((patient) => (
            <tr
              className="group cursor-pointer border-b border-surface-variant transition hover:bg-teal-50"
              key={patient.id}
              onClick={() => setDetailPatient(patient)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{patient.nome}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-muted opacity-0 transition group-hover:opacity-100" />
                </div>
                {patient.whatsapp && (
                  <span className="font-mono text-[11px] text-ink-muted">{patient.whatsapp}</span>
                )}
              </td>
              {!readonly ? <td className="px-4 py-3 font-mono text-sm text-secondary">{patient.cpf ?? "-"}</td> : null}
              <td className="px-4 py-3"><StatusPill value={patient.status} /></td>
              {readonly ? (
                <td className="px-4 py-3 text-sm text-secondary">
                  {patient.kanbanStage ? (KANBAN_LABEL[patient.kanbanStage] ?? patient.kanbanStage) : "-"}
                </td>
              ) : null}
              <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                <button
                  className="mr-2 rounded border border-outline-variant px-2 py-1 text-xs transition hover:border-primary hover:text-primary"
                  onClick={() => setSelectedPatient(patient)}
                  type="button"
                >
                  Prontuário
                </button>
                {!readonly ? (
                  <>
                    <button
                      className="mr-2 rounded border border-outline-variant px-2 py-1 text-xs transition hover:border-primary hover:text-primary"
                      onClick={() => openEditModal(patient)}
                      type="button"
                    >
                      Editar
                    </button>
                    <button
                      aria-label={`Excluir paciente ${patient.nome}`}
                      className="rounded p-1.5 text-secondary transition hover:bg-red-50 hover:text-error"
                      onClick={() => void confirmDangerAction(`Tem certeza que deseja excluir ${patient.nome}? Essa ação não pode ser desfeita.`).then((ok) => { if (ok) onDelete(patient.id); })}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </RefinedTable>
      )}
      {filteredPatients.length > 0 && (
        <Pagination
          total={filteredPatients.length}
          page={paginatedPatients.page}
          pageSize={pageSize}
          onPage={(p) => setPage(p)}
          onPageSize={(s) => { setPageSize(s); setPage(0); }}
        />
      )}

      {isPatientModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-surface shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface px-5 py-4">
              <div>
                <h3 className="font-bold text-on-surface">{form.id ? "Editar paciente" : "Novo paciente"}</h3>
                <p className="text-sm text-on-surface-variant">Preencha os dados principais. Endereço é opcional.</p>
              </div>
              <button className="rounded p-1 hover:bg-surface-container-low" onClick={() => setIsPatientModalOpen(false)} type="button">
                <X className="h-5 w-5 text-on-surface-variant" />
              </button>
            </div>
            <form className="space-y-5 p-5" onSubmit={(e) => {
              e.preventDefault();
              void onSave(patientPayload(form));
              setIsPatientModalOpen(false);
            }}>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Nome"><input className={inputClass()} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></Field>
                <Field label="WhatsApp"><input className={inputClass()} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} required /></Field>
                <Field label="CPF"><input className={inputClass()} value={form.cpf ?? ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></Field>
                <Field label="Nascimento"><input className={inputClass()} type="date" value={form.dataNascimento ?? ""} onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })} /></Field>
                <Field label="E-mail"><input className={inputClass()} type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                <Field label="Status">
                  <select className={inputClass()} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Patient["status"] })}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="retorno_pendente">Retorno pendente</option>
                  </select>
                </Field>
                <Field label="Profissional">
                  <select className={inputClass()} value={form.profissionalId ?? ""} onChange={(e) => setForm({ ...form, profissionalId: e.target.value || null })}>
                    <option value="">Não vincular</option>
                    {professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}
                  </select>
                </Field>
                <Field label="Valor total"><input className={inputClass()} type="number" value={form.valorTotalGasto} onChange={(e) => setForm({ ...form, valorTotalGasto: Number(e.target.value) })} /></Field>
                <Field label="Observações"><input className={inputClass()} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></Field>
              </div>

              <div className="rounded-xl border border-outline-variant p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.05em] text-secondary">Endereço opcional</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Rua"><input className={inputClass()} value={form.rua} onChange={(e) => setForm({ ...form, rua: e.target.value })} /></Field>
                  <Field label="Número"><input className={inputClass()} value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></Field>
                  <Field label="Bairro"><input className={inputClass()} value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></Field>
                  <Field label="Cidade"><input className={inputClass()} value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></Field>
                  <Field label="CEP"><input className={inputClass()} value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} /></Field>
                  <Field label="Ponto de referência"><input className={inputClass()} value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} /></Field>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-outline-variant pt-4">
                <button className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-low" onClick={() => setIsPatientModalOpen(false)} type="button">
                  Cancelar
                </button>
                <button className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark" type="submit">
                  Salvar paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {detailPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface shadow-xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-wash text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-on-surface">{detailPatient.nome}</h3>
                  <StatusPill value={detailPatient.status} />
                </div>
              </div>
              <button className="rounded p-1 hover:bg-surface-container-low" onClick={() => setDetailPatient(null)} type="button">
                <X className="h-5 w-5 text-on-surface-variant" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 p-5">
              {/* Contato */}
              <section>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-secondary">Contato</p>
                <div className="grid gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-sm">
                  <div className="flex items-center gap-2 text-ink">
                    <MessageCircle className="h-4 w-4 shrink-0 text-secondary" />
                    <span className="font-mono">{detailPatient.whatsapp || "—"}</span>
                  </div>
                  {detailPatient.email && (
                    <div className="flex items-center gap-2 text-ink">
                      <span className="h-4 w-4 shrink-0 text-center text-secondary text-xs">@</span>
                      <span>{detailPatient.email}</span>
                    </div>
                  )}
                  {detailPatient.cpf && (
                    <div className="flex items-center gap-2 text-ink">
                      <User className="h-4 w-4 shrink-0 text-secondary" />
                      <span className="font-mono">CPF: {detailPatient.cpf}</span>
                    </div>
                  )}
                  {detailPatient.dataNascimento && (
                    <div className="flex items-center gap-2 text-ink">
                      <Calendar className="h-4 w-4 shrink-0 text-secondary" />
                      <span>
                        {new Date(`${detailPatient.dataNascimento}T12:00:00`).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                  {detailPatient.endereco && (
                    <div className="flex items-start gap-2 text-ink">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                      <span>{detailPatient.endereco}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Clínica */}
              <section>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-secondary">Clínica</p>
                <div className="grid gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-sm">
                  {detailPatient.profissionalId && (
                    <div className="flex justify-between">
                      <span className="text-secondary">Profissional</span>
                      <span className="font-medium text-ink">
                        {professionals.find((p) => p.id === detailPatient.profissionalId)?.nome ?? "—"}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-secondary">Total gasto</span>
                    <span className="font-semibold text-ink">{brl.format(detailPatient.valorTotalGasto ?? 0)}</span>
                  </div>
                  {detailPatient.ultimoAtendimento && (
                    <div className="flex justify-between">
                      <span className="text-secondary">Último atendimento</span>
                      <span className="text-ink">
                        {new Date(`${detailPatient.ultimoAtendimento}T12:00:00`).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                  {detailPatient.proximoRetorno && (
                    <div className="flex justify-between">
                      <span className="text-secondary">Próximo retorno</span>
                      <span className="text-ink">
                        {new Date(`${detailPatient.proximoRetorno}T12:00:00`).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                  {detailPatient.kanbanStage && (
                    <div className="flex justify-between">
                      <span className="text-secondary">Fase</span>
                      <span className="text-ink">{KANBAN_LABEL[detailPatient.kanbanStage] ?? detailPatient.kanbanStage}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Observações */}
              {detailPatient.observacoes && (
                <section>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-secondary">Observações</p>
                  <p className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-sm text-ink">
                    {detailPatient.observacoes}
                  </p>
                </section>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex flex-wrap gap-2 border-t border-outline-variant px-5 py-4">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1ebe5d]"
                type="button"
                onClick={() => { setMsgPatient(detailPatient); setDetailPatient(null); }}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary"
                type="button"
                onClick={() => { setSelectedPatient(detailPatient); setDetailPatient(null); }}
              >
                Prontuário
              </button>
              {!readonly && (
                <button
                  className="inline-flex items-center gap-2 rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary"
                  type="button"
                  onClick={() => { openEditModal(detailPatient); setDetailPatient(null); }}
                >
                  Editar
                </button>
              )}
              {role === "admin" && onAnonymize && (
                <button
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-error hover:bg-red-50"
                  type="button"
                  onClick={() => void confirmDangerAction(
                    `Anonimizar ${detailPatient.nome}? Todos os dados pessoais (nome, CPF, WhatsApp, e-mail, endereço) serão apagados permanentemente. Esta ação não pode ser desfeita.`
                  ).then((ok) => { if (ok) { void onAnonymize(detailPatient.id); setDetailPatient(null); } })}
                >
                  Anonimizar (LGPD)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {msgPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <div>
                <h3 className="font-bold text-on-surface">Enviar mensagem</h3>
                <p className="text-sm text-on-surface-variant">
                  {msgPatient.nome} · {msgPatient.whatsapp}
                </p>
              </div>
              <button
                className="rounded p-1 hover:bg-surface-container-low"
                type="button"
                onClick={() => { setMsgPatient(null); setMsgFeedback(null); }}
              >
                <X className="h-5 w-5 text-on-surface-variant" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {msgFeedback && (
                <div className={`rounded-lg px-4 py-2.5 text-sm font-medium ${msgFeedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {msgFeedback.text}
                </div>
              )}
              <Field label="Mensagem">
                <textarea
                  className={`${inputClass()} resize-none`}
                  rows={4}
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  placeholder={`Olá, ${msgPatient.nome.split(" ")[0]}! Aqui é da Análise Saúde...`}
                  disabled={sendingMsg}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-3 border-t border-outline-variant px-5 py-4">
              <button
                className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-low"
                type="button"
                onClick={() => { setMsgPatient(null); setMsgFeedback(null); }}
              >
                Fechar
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1ebe5d] disabled:opacity-50"
                disabled={sendingMsg || !msgText.trim()}
                type="button"
                onClick={() => void handleSendMsg()}
              >
                {sendingMsg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
