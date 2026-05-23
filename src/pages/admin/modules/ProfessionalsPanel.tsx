import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock, Plus, Trash2, X } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { ImageUpload } from "../../../components/ui/ImageUpload";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
import {
  DAY_NAMES,
  FREQUENCY_LABELS,
  WEEK_OF_MONTH_LABELS,
  deleteSchedule,
  formatScheduleSummary,
  loadProfessionalSchedules,
  saveSchedule,
  type ProfessionalSchedule,
} from "../../../services/professionalScheduleService";
import type { Professional, UserRole } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";

// ── Modal de gerenciamento de horários ───────────────────────────────────────

const EMPTY_SCHEDULE_FORM = {
  dayOfWeek: 1,
  frequency: "weekly" as ProfessionalSchedule["frequency"],
  referenceDate: "",
  weekOfMonth: 1,
  startTime: "08:00",
  endTime: "18:00",
  notes: "",
};

function ScheduleModal({
  professional,
  clinicId,
  onClose,
}: {
  readonly professional: Professional;
  readonly clinicId: string;
  readonly onClose: () => void;
}) {
  const [schedules, setSchedules] = useState<ProfessionalSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_SCHEDULE_FORM);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSchedules(await loadProfessionalSchedules(professional.id));
    } finally {
      setLoading(false);
    }
  }, [professional.id]);

  useEffect(() => { void load(); }, [load]);

  async function handleAdd() {
    if (!form.startTime || !form.endTime) { setError("Informe os horários de início e fim."); return; }
    if (form.startTime >= form.endTime) { setError("Horário de início deve ser anterior ao término."); return; }
    if (form.frequency === "biweekly" && !form.referenceDate) {
      setError("Para frequência quinzenal, informe a data de referência (primeiro dia de atendimento)."); return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveSchedule(clinicId, {
        professionalId: professional.id,
        dayOfWeek: form.dayOfWeek,
        frequency: form.frequency,
        referenceDate: form.frequency === "biweekly" ? form.referenceDate : null,
        weekOfMonth: form.frequency === "monthly" ? form.weekOfMonth : null,
        startTime: form.startTime,
        endTime: form.endTime,
        active: true,
        notes: form.notes || null,
      });
      setForm(EMPTY_SCHEDULE_FORM);
      await load();
    } catch {
      setError("Erro ao salvar horário. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirmDangerAction("Remover este horário da agenda?");
    if (!ok) return;
    await deleteSchedule(id);
    await load();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            {professional.fotoUrl ? (
              <img src={professional.fotoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {professional.nome.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Agenda de atendimento</p>
              <h2 className="text-base font-semibold text-ink">{professional.nome}</h2>
            </div>
          </div>
          <button
            className="rounded-xl p-1.5 text-ink-muted transition hover:bg-surface-low hover:text-ink"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Horários cadastrados */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Dias de atendimento cadastrados
            </p>
            {loading ? (
              <p className="text-sm text-ink-muted">Carregando...</p>
            ) : schedules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface-low px-4 py-6 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-ink-muted opacity-40" />
                <p className="mt-2 text-sm text-ink-muted">Nenhum horário cadastrado.</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Adicione abaixo os dias em que este profissional atende.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {schedules.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-low px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{formatScheduleSummary(s)}</p>
                      {s.notes && <p className="mt-0.5 truncate text-xs text-ink-muted">{s.notes}</p>}
                    </div>
                    <button
                      className="shrink-0 rounded-lg p-1.5 text-ink-muted transition hover:bg-red-50 hover:text-error"
                      type="button"
                      onClick={() => void handleDelete(s.id)}
                      aria-label="Remover horário"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulário de novo horário */}
          <div className="space-y-3 rounded-2xl border border-border-divider bg-surface-low p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Adicionar dia de atendimento
            </p>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Dia da semana">
                <select
                  className={inputClass()}
                  value={form.dayOfWeek}
                  onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
                >
                  {DAY_NAMES.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Frequência">
                <select
                  className={inputClass()}
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value as ProfessionalSchedule["frequency"] })}
                >
                  {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>

              {/* Data de referência para quinzenal */}
              {form.frequency === "biweekly" && (
                <div className="sm:col-span-2">
                  <Field label="Data do primeiro atendimento (referência quinzenal)">
                    <input
                      className={inputClass()}
                      type="date"
                      value={form.referenceDate}
                      onChange={(e) => setForm({ ...form, referenceDate: e.target.value })}
                    />
                  </Field>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    O sistema calculará automaticamente as datas quinzenais a partir daqui.
                  </p>
                </div>
              )}

              {/* Semana do mês para mensal */}
              {form.frequency === "monthly" && (
                <div className="sm:col-span-2">
                  <Field label="Qual semana do mês?">
                    <select
                      className={inputClass()}
                      value={form.weekOfMonth}
                      onChange={(e) => setForm({ ...form, weekOfMonth: Number(e.target.value) })}
                    >
                      {Object.entries(WEEK_OF_MONTH_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              <Field label="Início do atendimento">
                <input
                  className={inputClass()}
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </Field>

              <Field label="Fim do atendimento">
                <input
                  className={inputClass()}
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Observação (opcional)">
                  <input
                    className={inputClass()}
                    placeholder="Ex: Atende somente pela manhã na última semana do mês"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <button
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
              type="button"
              disabled={saving}
              onClick={() => void handleAdd()}
            >
              <Plus className="h-4 w-4" />
              {saving ? "Salvando..." : "Adicionar horário"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Painel principal ──────────────────────────────────────────────────────────

const emptyForm = {
  id: "", nome: "", especialidade: "", email: "", senha: "",
  telefone: "", registro: "", conselho: "CRM", fotoUrl: "",
};

export function ProfessionalsPanel({
  professionals,
  clinicId,
  onSave,
  onDelete,
  onCreateAccess,
}: {
  readonly professionals: Professional[];
  readonly clinicId: string;
  readonly onSave: (values: Pick<Professional, "nome" | "especialidade" | "email" | "telefone" | "registro" | "conselho" | "fotoUrl" | "ativo"> & { id?: string }) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
  readonly onCreateAccess: (values: {
    nome: string; email: string; password: string; role: UserRole; profissionalId?: string | null;
    professional?: { especialidade: string; telefone?: string | null; registro?: string | null; conselho?: string | null; fotoUrl?: string | null };
  }) => Promise<void>;
}) {
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [scheduleFor, setScheduleFor] = useState<Professional | null>(null);

  const filtered = professionals.filter((p) =>
    `${p.nome} ${p.especialidade} ${p.email ?? ""} ${p.registro ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.id) {
      void onSave({ id: form.id, nome: form.nome, especialidade: form.especialidade, email: form.email, telefone: form.telefone, registro: form.registro, conselho: form.conselho, fotoUrl: form.fotoUrl, ativo: true });
    } else if (form.email && form.senha) {
      void onCreateAccess({ nome: form.nome, email: form.email, password: form.senha, role: "profissional", professional: { especialidade: form.especialidade, telefone: form.telefone, registro: form.registro, conselho: form.conselho, fotoUrl: form.fotoUrl } });
    } else {
      void onSave({ ...form, ativo: true });
    }
    setForm(emptyForm);
  }

  return (
    <>
      {scheduleFor && (
        <ScheduleModal
          professional={scheduleFor}
          clinicId={clinicId}
          onClose={() => setScheduleFor(null)}
        />
      )}

      <SectionCard title="Profissionais" description="Gerencie equipe clínica, especialidades e dias de atendimento.">
        <div className="mb-4">
          <Field label="Filtrar profissionais">
            <input
              className={inputClass()}
              placeholder="Nome, especialidade, e-mail ou registro"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
        </div>

        <form
          className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-9"
          onSubmit={handleSubmit}
        >
          <Field label="Nome"><input className={inputClass()} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></Field>
          <Field label="Especialidade"><input className={inputClass()} value={form.especialidade} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} required /></Field>
          <Field label="E-mail"><input className={inputClass()} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Senha de acesso"><input className={inputClass()} minLength={8} type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="Opcional" /></Field>
          <Field label="Telefone"><input className={inputClass()} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></Field>
          <Field label="Conselho">
            <select className={inputClass()} value={form.conselho} onChange={(e) => setForm({ ...form, conselho: e.target.value })}>
              <option>CRM</option><option>CRO</option><option>CRP</option><option>CREFITO</option><option>COREN</option><option>Outro</option>
            </select>
          </Field>
          <Field label="Registro"><input className={inputClass()} value={form.registro} onChange={(e) => setForm({ ...form, registro: e.target.value })} /></Field>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">Foto</label>
            <ImageUpload
              currentUrl={form.fotoUrl || null}
              bucket="clinic-photos"
              path={`professionals/${form.id || "novo"}`}
              onUpload={(url) => setForm({ ...form, fotoUrl: url })}
              onRemove={() => setForm({ ...form, fotoUrl: "" })}
              shape="circle"
              size="sm"
              placeholder="Foto"
            />
          </div>
          <button
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-medium text-white"
            type="submit"
          >
            <Plus className="h-4 w-4" />
            {form.id ? "Atualizar" : form.email && form.senha ? "Criar com acesso" : "Adicionar"}
          </button>
        </form>

        {filtered.length === 0 ? (
          <EmptyState title="Nenhum profissional" message="Cadastre o primeiro profissional para abrir a agenda." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((professional) => (
              <article
                key={professional.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  {professional.fotoUrl ? (
                    <img alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" src={professional.fotoUrl} />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      {professional.nome.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{professional.nome}</p>
                    <p className="text-sm text-ink-secondary">
                      {professional.especialidade} · {professional.conselho ?? ""} {professional.registro ?? ""}
                    </p>
                    <p className="text-xs text-ink-muted">{professional.email ?? ""} {professional.telefone ?? ""}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {/* Horários */}
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                    type="button"
                    onClick={() => setScheduleFor(professional)}
                  >
                    <Clock className="h-3 w-3" />
                    Horários
                  </button>
                  {/* Editar */}
                  <button
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition hover:border-primary hover:text-primary"
                    type="button"
                    onClick={() => setForm({ id: professional.id, nome: professional.nome, especialidade: professional.especialidade, email: professional.email ?? "", senha: "", telefone: professional.telefone ?? "", registro: professional.registro ?? "", conselho: professional.conselho ?? "CRM", fotoUrl: professional.fotoUrl ?? "" })}
                  >
                    Editar
                  </button>
                  {/* Excluir */}
                  <button
                    aria-label={`Excluir ${professional.nome}`}
                    className="rounded-lg p-1.5 text-ink-muted transition hover:bg-red-50 hover:text-error"
                    type="button"
                    onClick={() => void confirmDangerAction(`Excluir ${professional.nome}? Essa ação não pode ser desfeita.`).then((ok) => { if (ok) onDelete(professional.id); })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
