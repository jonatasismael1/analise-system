import { useMemo, useState } from "react";
import { Bot, MessageCircle, X } from "lucide-react";
import { askDeby } from "../../../services/debyService";
import { brl, todayISO } from "../../../lib/formatters";
import type { Appointment, Patient, Professional } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";

type KanbanStage = NonNullable<Patient["kanbanStage"]>;

const COLUMNS: Array<{ id: KanbanStage; title: string; help: string; accentClass: string }> = [
  { id: "novo",     title: "Novo",             help: "Cadastrado, sem consulta ainda.",           accentClass: "border-t-sky-400"     },
  { id: "agendado", title: "Agendado",          help: "Consulta futura pendente ou confirmada.",   accentClass: "border-t-indigo-400"  },
  { id: "atendido", title: "Atendido",          help: "Realizou consulta recente.",                accentClass: "border-t-emerald-400" },
  { id: "retorno",  title: "Retorno pendente",  help: "Precisa agendar retorno.",                  accentClass: "border-t-amber-400"   },
  { id: "faltou",   title: "Faltou",            help: "Não compareceu — contato de recuperação.", accentClass: "border-t-rose-400"    },
  { id: "inativo",  title: "Inativo",           help: "Sem movimento recente.",                    accentClass: "border-t-slate-400"   },
];

function stageFor(patient: Patient, appointments: Appointment[], today: string): KanbanStage {
  if (patient.kanbanStage) return patient.kanbanStage;
  const appts = appointments.filter((a) => a.pacienteId === patient.id);
  if (appts.some((a) => a.status === "faltou")) return "faltou";
  if (patient.status === "inativo") return "inativo";
  if (patient.status === "retorno_pendente" || (patient.proximoRetorno && patient.proximoRetorno <= today)) return "retorno";
  if (appts.some((a) => a.data >= today && ["pendente", "confirmado"].includes(a.status))) return "agendado";
  if (appts.some((a) => ["concluido", "confirmado"].includes(a.status)) || patient.ultimoAtendimento) return "atendido";
  return "novo";
}

// ── Modal de detalhes do paciente ────────────────────────────────────────────

function PatientModal({
  patient,
  stage,
  appointments,
  professionals,
  clinicId,
  onClose,
  onSave,
}: {
  readonly patient: Patient;
  readonly stage: KanbanStage;
  readonly appointments: Appointment[];
  readonly professionals: Professional[];
  readonly clinicId: string;
  readonly onClose: () => void;
  readonly onSave: (updated: Patient) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [obs, setObs] = useState(patient.observacoes ?? "");
  const [retorno, setRetorno] = useState(patient.proximoRetorno ?? "");
  const [targetStage, setTargetStage] = useState<KanbanStage>(stage);
  const [saving, setSaving] = useState(false);
  const [debyOutput, setDebyOutput] = useState("");
  const [debyLoading, setDebyLoading] = useState(false);

  const profissional = professionals.find((p) => p.id === patient.profissionalId);
  const recentAppts = appointments
    .filter((a) => a.pacienteId === patient.id)
    .sort((a, b) => `${b.data} ${b.horario}`.localeCompare(`${a.data} ${a.horario}`))
    .slice(0, 5);

  const columnInfo = COLUMNS.find((c) => c.id === stage);

  async function handleSave() {
    setSaving(true);
    const nextStatus: Patient["status"] =
      targetStage === "inativo" ? "inativo" : targetStage === "retorno" ? "retorno_pendente" : "ativo";
    try {
      await onSave({ ...patient, observacoes: obs || null, proximoRetorno: retorno || null, kanbanStage: targetStage, status: nextStatus });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickMove(newStage: KanbanStage) {
    const nextStatus: Patient["status"] =
      newStage === "inativo" ? "inativo" : newStage === "retorno" ? "retorno_pendente" : "ativo";
    await onSave({ ...patient, kanbanStage: newStage, status: nextStatus });
    onClose();
  }

  async function askDebyAI() {
    setDebyLoading(true);
    setDebyOutput("");
    const action = stage === "faltou" ? "missed_patient_followup" : "patient_reactivation";
    const recentInfo = recentAppts
      .slice(0, 3)
      .map((a) => `${a.data} — ${a.servico || "Consulta"} (${a.status})`)
      .join("; ");
    const text = [
      `Paciente: ${patient.nome}`,
      `Último atendimento: ${patient.ultimoAtendimento ?? "Não registrado"}`,
      `Próximo retorno previsto: ${patient.proximoRetorno ?? "Não definido"}`,
      `Consultas recentes: ${recentInfo || "Nenhuma"}`,
      `Observações: ${patient.observacoes ?? "Nenhuma"}`,
    ].join("\n");
    try {
      const output = await askDeby({ clinicId, action, module: "controle_atendimento", text });
      setDebyOutput(output);
    } finally {
      setDebyLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl border border-border bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Controle de Atendimento</p>
            <h2 className="text-lg font-bold text-ink">{patient.nome}</h2>
          </div>
          <button
            className="rounded-xl p-1.5 text-ink-muted transition hover:bg-surface-low hover:text-ink"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {columnInfo && (
              <span className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
                {columnInfo.title}
              </span>
            )}
            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
              patient.status === "ativo" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
              patient.status === "inativo" ? "border-slate-200 bg-slate-50 text-slate-600" :
              "border-amber-200 bg-amber-50 text-amber-700"
            }`}>
              {patient.status === "ativo" ? "Ativo" : patient.status === "inativo" ? "Inativo" : "Retorno pendente"}
            </span>
            <span className="rounded-full border border-border bg-surface-low px-3 py-1 text-[11px] text-ink-secondary">
              {brl.format(patient.valorTotalGasto)} em consultas
            </span>
          </div>

          {!editing ? (
            <div className="space-y-3">
              {/* Informações do paciente */}
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "WhatsApp", value: patient.whatsapp || "Não informado" },
                  { label: "E-mail", value: patient.email ?? "Não informado" },
                  { label: "CPF", value: patient.cpf ?? "Não informado" },
                  { label: "Profissional", value: profissional?.nome ?? "Sem vínculo" },
                  {
                    label: "Próximo retorno",
                    value: patient.proximoRetorno
                      ? new Date(`${patient.proximoRetorno}T12:00:00`).toLocaleDateString("pt-BR")
                      : "Não definido",
                  },
                  {
                    label: "Último atendimento",
                    value: patient.ultimoAtendimento
                      ? new Date(`${patient.ultimoAtendimento}T12:00:00`).toLocaleDateString("pt-BR")
                      : "Não registrado",
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{label}</p>
                    <p className="mt-0.5 text-sm text-ink">{value}</p>
                  </div>
                ))}
              </div>

              {patient.observacoes && (
                <div className="rounded-xl border border-border-divider bg-surface-low p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Observações</p>
                  <p className="mt-1 text-sm text-ink">{patient.observacoes}</p>
                </div>
              )}

              {/* Histórico de consultas */}
              {recentAppts.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Últimas consultas</p>
                  <div className="space-y-1.5">
                    {recentAppts.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-xl border border-border-divider bg-surface-low px-3 py-2 text-xs"
                      >
                        <span className="text-ink">
                          {new Date(`${a.data}T12:00:00`).toLocaleDateString("pt-BR")} — {a.servico || "Consulta"}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          a.status === "confirmado" ? "bg-emerald-50 text-emerald-700" :
                          a.status === "cancelado"  ? "bg-slate-100 text-slate-500" :
                          a.status === "faltou"     ? "bg-red-50 text-red-600" :
                          "bg-blue-50 text-blue-700"
                        }`}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mover etapa */}
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">Mover para etapa</p>
                <select
                  className={inputClass()}
                  value={stage}
                  onChange={(e) => void handleQuickMove(e.target.value as KanbanStage)}
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Observações">
                <textarea className={inputClass()} rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />
              </Field>
              <Field label="Próximo retorno">
                <input className={inputClass()} type="date" value={retorno} onChange={(e) => setRetorno(e.target.value)} />
              </Field>
              <Field label="Etapa">
                <select className={inputClass()} value={targetStage} onChange={(e) => setTargetStage(e.target.value as KanbanStage)}>
                  {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </Field>
            </div>
          )}

          {/* Deby AI */}
          {!editing && (
            <div>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-ink-secondary transition hover:border-primary hover:text-primary disabled:opacity-50"
                type="button"
                disabled={debyLoading}
                onClick={() => void askDebyAI()}
              >
                <Bot className="h-4 w-4" />
                {debyLoading
                  ? "Gerando mensagem..."
                  : stage === "faltou"
                  ? "Deby: mensagem para faltoso"
                  : "Deby: mensagem de reativação"}
              </button>
              {debyOutput && (
                <div className="mt-3 whitespace-pre-wrap rounded-xl border border-teal-100 bg-teal-50 p-3 text-[12px] text-teal-900">
                  {debyOutput}
                </div>
              )}
            </div>
          )}

          {/* WhatsApp */}
          {!editing && patient.whatsapp && (
            <a
              href={`https://wa.me/${patient.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              <MessageCircle className="h-4 w-4" />
              Abrir no WhatsApp
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
          <p className="text-[11px] text-ink-muted">
            {recentAppts.length} consulta(s) registrada(s)
          </p>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <button
                  className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-ink-secondary transition hover:border-error hover:text-error"
                  type="button"
                  onClick={() => { setObs(patient.observacoes ?? ""); setRetorno(patient.proximoRetorno ?? ""); setTargetStage(stage); setEditing(false); }}
                >
                  Cancelar
                </button>
                <button
                  className="rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </>
            ) : (
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-ink-secondary transition hover:border-primary hover:text-primary"
                type="button"
                onClick={() => setEditing(true)}
              >
                Editar observações
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Painel principal ──────────────────────────────────────────────────────────

export function AttendanceControlPanel({
  clinicId,
  patients,
  appointments,
  professionals,
  onSave,
}: {
  readonly clinicId: string;
  readonly patients: Patient[];
  readonly appointments: Appointment[];
  readonly professionals: Professional[];
  readonly onSave: (values: Patient) => Promise<void>;
}) {
  const [filters, setFilters] = useState({ search: "", professionalId: "todos" });
  const [draggedPatientId, setDraggedPatientId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<{ patient: Patient; stage: KanbanStage } | null>(null);
  const today = todayISO();

  const filteredPatients = useMemo(() =>
    patients.filter((p) => {
      const matchSearch = `${p.nome} ${p.whatsapp} ${p.email ?? ""}`.toLowerCase().includes(filters.search.toLowerCase());
      const matchProf = filters.professionalId === "todos" || p.profissionalId === filters.professionalId;
      return matchSearch && matchProf;
    }),
    [patients, filters]
  );

  async function movePatient(patient: Patient, stage: KanbanStage) {
    const nextStatus: Patient["status"] =
      stage === "inativo" ? "inativo" : stage === "retorno" ? "retorno_pendente" : "ativo";
    await onSave({ ...patient, status: nextStatus, kanbanStage: stage });
  }

  return (
    <div className="space-y-4">
      {selectedPatient && (
        <PatientModal
          patient={selectedPatient.patient}
          stage={selectedPatient.stage}
          appointments={appointments}
          professionals={professionals}
          clinicId={clinicId}
          onClose={() => setSelectedPatient(null)}
          onSave={async (updated) => { await onSave(updated); setSelectedPatient(null); }}
        />
      )}

      {/* Filtros */}
      <div className="rounded-3xl border border-border bg-white p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-[1fr_260px]">
          <Field label="Buscar paciente">
            <input
              className={inputClass()}
              placeholder="Nome, WhatsApp ou e-mail"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </Field>
          <Field label="Profissional">
            <select
              className={inputClass()}
              value={filters.professionalId}
              onChange={(e) => setFilters({ ...filters, professionalId: e.target.value })}
            >
              <option value="todos">Todos</option>
              {professionals.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Kanban */}
      <div className="rounded-3xl border border-border bg-white p-4 shadow-card">
        <p className="mb-4 text-sm text-ink-secondary">
          Clique em um card para ver detalhes e ações. Arraste para mover entre etapas.
        </p>
        <div className="-mx-1 overflow-x-auto pb-3">
          <div className="flex gap-3 px-1" style={{ minWidth: `${COLUMNS.length * 292}px` }}>
            {COLUMNS.map((column) => {
              const items = filteredPatients.filter(
                (p) => stageFor(p, appointments, today) === column.id
              );
              return (
                <section
                  key={column.id}
                  className={`flex w-[280px] shrink-0 flex-col rounded-xl border border-t-4 bg-surface-low ${column.accentClass} border-border`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const patient = filteredPatients.find((p) => p.id === draggedPatientId);
                    setDraggedPatientId(null);
                    if (patient && stageFor(patient, appointments, today) !== column.id) {
                      void movePatient(patient, column.id);
                    }
                  }}
                >
                  {/* Cabeçalho da coluna */}
                  <div className="border-b border-border px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-ink">{column.title}</h3>
                      <span className="rounded-full border border-border bg-white px-2 py-0.5 text-xs font-semibold text-ink-secondary">
                        {items.length}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-muted">{column.help}</p>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 520 }}>
                    {items.length === 0 ? (
                      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border bg-white/60">
                        <p className="text-[11px] font-medium text-ink-muted">Solte pacientes aqui</p>
                      </div>
                    ) : (
                      items.map((patient) => {
                        const prof = professionals.find((pr) => pr.id === patient.profissionalId);
                        const nextReturn = patient.proximoRetorno
                          ? new Date(`${patient.proximoRetorno}T12:00:00`).toLocaleDateString("pt-BR")
                          : null;
                        return (
                          <article
                            key={patient.id}
                            className="cursor-pointer rounded-xl border border-border bg-white p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                            draggable
                            onClick={() => setSelectedPatient({ patient, stage: stageFor(patient, appointments, today) })}
                            onDragStart={() => setDraggedPatientId(patient.id)}
                            onDragEnd={() => setDraggedPatientId(null)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink">{patient.nome}</p>
                                <p className="mt-0.5 text-xs text-ink-muted">{patient.whatsapp || "Sem WhatsApp"}</p>
                              </div>
                              <span className="shrink-0 text-[11px] font-semibold text-ink-secondary">
                                {brl.format(patient.valorTotalGasto)}
                              </span>
                            </div>
                            {(prof || nextReturn) && (
                              <div className="mt-2 space-y-0.5 text-[11px] text-ink-muted">
                                {prof && <p>Dr(a). {prof.nome}</p>}
                                {nextReturn && <p>Retorno: {nextReturn}</p>}
                              </div>
                            )}
                            <p className="mt-2 text-[10px] font-medium text-primary/70">Clique para detalhes →</p>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
