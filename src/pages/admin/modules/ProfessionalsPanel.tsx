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

// ── Modal de criar / editar profissional ─────────────────────────────────────

const emptyForm = {
  id: "", nome: "", especialidade: "", email: "", senha: "",
  telefone: "", registro: "", conselho: "CRM", fotoUrl: "",
};

function ProfessionalModal({
  initial,
  onSave,
  onCreateAccess,
  onClose,
}: {
  readonly initial?: Professional | null;
  readonly onSave: (values: Pick<Professional, "nome" | "especialidade" | "email" | "telefone" | "registro" | "conselho" | "fotoUrl" | "ativo"> & { id?: string }) => Promise<void>;
  readonly onCreateAccess: (values: {
    nome: string; email: string; password: string; role: UserRole; profissionalId?: string | null;
    professional?: { especialidade: string; telefone?: string | null; registro?: string | null; conselho?: string | null; fotoUrl?: string | null };
  }) => Promise<void>;
  readonly onClose: () => void;
}) {
  const [form, setForm] = useState(() =>
    initial
      ? { id: initial.id, nome: initial.nome, especialidade: initial.especialidade, email: initial.email ?? "", senha: "", telefone: initial.telefone ?? "", registro: initial.registro ?? "", conselho: initial.conselho ?? "CRM", fotoUrl: initial.fotoUrl ?? "" }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const isNew = !form.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (!isNew) {
        await onSave({ id: form.id, nome: form.nome, especialidade: form.especialidade, email: form.email, telefone: form.telefone, registro: form.registro, conselho: form.conselho, fotoUrl: form.fotoUrl, ativo: true });
      } else if (form.email && form.senha) {
        await onCreateAccess({ nome: form.nome, email: form.email, password: form.senha, role: "profissional", professional: { especialidade: form.especialidade, telefone: form.telefone, registro: form.registro, conselho: form.conselho, fotoUrl: form.fotoUrl } });
      } else {
        await onSave({ nome: form.nome, especialidade: form.especialidade, email: form.email, telefone: form.telefone, registro: form.registro, conselho: form.conselho, fotoUrl: form.fotoUrl, ativo: true });
      }
      onClose();
    } finally {
      setSaving(false);
    }
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
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Profissionais</p>
            <h2 className="text-base font-semibold text-ink">
              {isNew ? "Novo profissional" : "Editar profissional"}
            </h2>
          </div>
          <button
            className="rounded-xl p-1.5 text-ink-muted transition hover:bg-surface-low hover:text-ink"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form className="space-y-4 p-5" onSubmit={(e) => void handleSubmit(e)}>
          {/* Foto */}
          <div className="flex items-center gap-4">
            <ImageUpload
              currentUrl={form.fotoUrl || null}
              bucket="clinic-photos"
              path={`professionals/${form.id || "novo"}`}
              onUpload={(url) => setForm({ ...form, fotoUrl: url })}
              onRemove={() => setForm({ ...form, fotoUrl: "" })}
              shape="circle"
              size="md"
              placeholder="Foto"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Foto do profissional</p>
              <p className="mt-0.5 text-xs text-ink-muted">Aparece no perfil e no cartão</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome *">
              <input className={inputClass()} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </Field>
            <Field label="Especialidade *">
              <input className={inputClass()} value={form.especialidade} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} required />
            </Field>
            <Field label="E-mail">
              <input className={inputClass()} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Telefone">
              <input className={inputClass()} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </Field>
            <Field label="Conselho">
              <select className={inputClass()} value={form.conselho} onChange={(e) => setForm({ ...form, conselho: e.target.value })}>
                <option>CRM</option>
                <option>CRO</option>
                <option>CRP</option>
                <option>CREFITO</option>
                <option>COREN</option>
                <option>Outro</option>
              </select>
            </Field>
            <Field label="Número de registro">
              <input className={inputClass()} value={form.registro} onChange={(e) => setForm({ ...form, registro: e.target.value })} />
            </Field>

            {/* Senha apenas para novo profissional com acesso ao sistema */}
            {isNew && (
              <div className="sm:col-span-2">
                <Field label="Senha de acesso ao sistema">
                  <input
                    className={inputClass()}
                    type="password"
                    minLength={8}
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                    placeholder="Mínimo 8 caracteres — deixe em branco se não precisar de acesso"
                  />
                </Field>
                {form.email && form.senha && (
                  <p className="mt-1 text-[11px] text-primary">
                    Será criado login de acesso para este profissional.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-ink-secondary transition hover:bg-surface-low"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-60"
              type="submit"
              disabled={saving}
            >
              {saving ? "Salvando..." : isNew ? (form.email && form.senha ? "Criar com acesso" : "Adicionar") : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
      setError("Para frequência quinzenal, informe a data do primeiro atendimento."); return;
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
              Dias de atendimento
            </p>
            {loading ? (
              <p className="text-sm text-ink-muted">Carregando...</p>
            ) : schedules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface-low px-4 py-6 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-ink-muted opacity-40" />
                <p className="mt-2 text-sm text-ink-muted">Nenhum horário cadastrado.</p>
                <p className="mt-0.5 text-xs text-ink-muted">Adicione abaixo os dias em que este profissional atende.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {schedules.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-low px-4 py-3">
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
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Adicionar dia de atendimento</p>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Dia da semana">
                <select className={inputClass()} value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}>
                  {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                </select>
              </Field>
              <Field label="Frequência">
                <select className={inputClass()} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as ProfessionalSchedule["frequency"] })}>
                  {Object.entries(FREQUENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>

              {form.frequency === "biweekly" && (
                <div className="sm:col-span-2">
                  <Field label="Data do primeiro atendimento (referência quinzenal)">
                    <input className={inputClass()} type="date" value={form.referenceDate} onChange={(e) => setForm({ ...form, referenceDate: e.target.value })} />
                  </Field>
                  <p className="mt-1 text-[11px] text-ink-muted">O sistema calculará as datas quinzenais a partir desta data.</p>
                </div>
              )}

              {form.frequency === "monthly" && (
                <div className="sm:col-span-2">
                  <Field label="Qual semana do mês?">
                    <select className={inputClass()} value={form.weekOfMonth} onChange={(e) => setForm({ ...form, weekOfMonth: Number(e.target.value) })}>
                      {Object.entries(WEEK_OF_MONTH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                </div>
              )}

              <Field label="Início">
                <input className={inputClass()} type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </Field>
              <Field label="Término">
                <input className={inputClass()} type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Observação (opcional)">
                  <input className={inputClass()} placeholder="Ex: Somente pela manhã na última semana do mês" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
  const [search, setSearch] = useState("");
  const [editingProfessional, setEditingProfessional] = useState<Professional | null | "new">(null);
  const [scheduleFor, setScheduleFor] = useState<Professional | null>(null);

  const filtered = professionals.filter((p) =>
    `${p.nome} ${p.especialidade} ${p.email ?? ""} ${p.registro ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Modal criar/editar profissional */}
      {editingProfessional !== null && (
        <ProfessionalModal
          initial={editingProfessional === "new" ? null : editingProfessional}
          onSave={onSave}
          onCreateAccess={onCreateAccess}
          onClose={() => setEditingProfessional(null)}
        />
      )}

      {/* Modal de horários */}
      {scheduleFor && (
        <ScheduleModal
          professional={scheduleFor}
          clinicId={clinicId}
          onClose={() => setScheduleFor(null)}
        />
      )}

      <SectionCard title="Profissionais" description="Gerencie equipe clínica, especialidades e dias de atendimento.">
        {/* Barra de ação */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <Field label="Filtrar profissionais">
              <input
                className={inputClass()}
                placeholder="Nome, especialidade, e-mail ou registro"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Field>
          </div>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark active:-translate-y-px"
            type="button"
            onClick={() => setEditingProfessional("new")}
          >
            <Plus className="h-4 w-4" />
            Novo profissional
          </button>
        </div>

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
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                    type="button"
                    onClick={() => setScheduleFor(professional)}
                  >
                    <Clock className="h-3 w-3" />
                    Horários
                  </button>
                  <button
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition hover:border-primary hover:text-primary"
                    type="button"
                    onClick={() => setEditingProfessional(professional)}
                  >
                    Editar
                  </button>
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
