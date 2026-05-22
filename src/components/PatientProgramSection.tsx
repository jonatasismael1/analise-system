import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Percent, Search, Users, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "../lib/toast";
import { getErrorMessage } from "../lib/getErrorMessage";
import type { Patient, PatientProgramMembership, MembershipRole, MembershipStatus, MembershipRelationship } from "../types/clinic";
import type { ProgramaDesconto } from "../pages/admin/modules/DiscountProgramsPanel";
import { ProgramBadge } from "./ui/ProgramBadge";
import { Field, inputClass } from "../pages/admin/components/Field";

interface PatientProgramSectionProps {
  readonly clinicId: string;
  readonly patientId: string;
  readonly patients: Patient[];
  readonly programas: ProgramaDesconto[];
  readonly readonly?: boolean;
  readonly onMembershipChange?: (membership: PatientProgramMembership | null) => void;
}

type MembershipForm = {
  programId: string;
  role: MembershipRole;
  holderPatientId: string;
  relationship: MembershipRelationship | "";
  status: MembershipStatus;
  startDate: string;
  endDate: string;
  notes: string;
};

const RELATIONSHIP_LABELS: Record<MembershipRelationship, string> = {
  filho: "Filho(a)",
  pai: "Pai",
  mae: "Mãe",
  conjuge: "Cônjuge",
  outro: "Outro",
};

const STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  suspended: "Suspenso",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function blankForm(programas: ProgramaDesconto[]): MembershipForm {
  return {
    programId: programas[0]?.id ?? "",
    role: "holder",
    holderPatientId: "",
    relationship: "",
    status: "active",
    startDate: todayISO(),
    endDate: "",
    notes: "",
  };
}

function mapRow(row: any): PatientProgramMembership {
  return {
    id: row.id,
    clinicaId: row.clinica_id,
    patientId: row.patient_id,
    programId: row.program_id,
    role: row.role as MembershipRole,
    holderPatientId: row.holder_patient_id,
    relationship: row.relationship,
    status: row.status as MembershipStatus,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function PatientProgramSection({
  clinicId,
  patientId,
  patients,
  programas,
  readonly = false,
  onMembershipChange,
}: PatientProgramSectionProps) {
  const [membership, setMembership] = useState<PatientProgramMembership | null>(null);
  const [dependents, setDependents] = useState<PatientProgramMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<MembershipForm>(blankForm(programas));

  // Holder search state
  const [holderSearch, setHolderSearch] = useState("");
  const [holderDropdownOpen, setHolderDropdownOpen] = useState(false);
  const holderRef = useRef<HTMLDivElement>(null);

  const loadMembership = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from("patient_program_memberships")
      .select("*")
      .eq("patient_id", patientId)
      .eq("status", "active")
      .maybeSingle();

    if (err) {
      console.error(err);
      setLoading(false);
      return;
    }

    const m = data ? mapRow(data) : null;
    setMembership(m);
    onMembershipChange?.(m);

    // Se é titular, busca dependentes
    if (m?.role === "holder") {
      const { data: deps } = await supabase
        .from("patient_program_memberships")
        .select("*")
        .eq("holder_patient_id", patientId)
        .eq("program_id", m.programId)
        .eq("status", "active");
      setDependents((deps ?? []).map(mapRow));
    } else {
      setDependents([]);
    }

    setLoading(false);
  }, [patientId, onMembershipChange]);

  useEffect(() => {
    void loadMembership();
  }, [loadMembership]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (holderRef.current && !holderRef.current.contains(e.target as Node)) {
        setHolderDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openCreate() {
    setForm(blankForm(programas));
    setHolderSearch("");
    setError(null);
    setEditing(true);
  }

  function openEdit() {
    if (!membership) return;
    const holderPatient = membership.holderPatientId
      ? patients.find((p) => p.id === membership.holderPatientId)
      : null;
    setForm({
      programId: membership.programId,
      role: membership.role,
      holderPatientId: membership.holderPatientId ?? "",
      relationship: membership.relationship ?? "",
      status: membership.status,
      startDate: membership.startDate,
      endDate: membership.endDate ?? "",
      notes: membership.notes ?? "",
    });
    setHolderSearch(holderPatient?.nome ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleRemove() {
    if (!membership) return;
    setSaving(true);
    const { error: err } = await supabase
      .from("patient_program_memberships")
      .update({ status: "inactive" })
      .eq("id", membership.id);
    setSaving(false);
    if (err) { toast.error(getErrorMessage(err)); return; }
    toast.success("Vínculo com programa removido.");
    await loadMembership();
    setEditing(false);
  }

  async function handleSave() {
    setError(null);
    if (!form.programId) { setError("Selecione um programa."); return; }
    if (form.role === "dependent" && !form.holderPatientId) {
      setError("Selecione o paciente titular.");
      return;
    }
    if (form.role === "dependent" && form.holderPatientId === patientId) {
      setError("O paciente não pode ser dependente de si mesmo.");
      return;
    }

    // Valida que o titular pertence ao mesmo programa
    if (form.role === "dependent") {
      const { data: holderCheck } = await supabase
        .from("patient_program_memberships")
        .select("id")
        .eq("patient_id", form.holderPatientId)
        .eq("program_id", form.programId)
        .eq("role", "holder")
        .eq("status", "active")
        .maybeSingle();
      if (!holderCheck) {
        setError("O paciente selecionado como titular não está ativo neste programa como titular.");
        return;
      }
    }

    setSaving(true);
    const payload = {
      clinica_id: clinicId,
      patient_id: patientId,
      program_id: form.programId,
      role: form.role,
      holder_patient_id: form.role === "dependent" ? form.holderPatientId : null,
      relationship: form.role === "dependent" && form.relationship ? form.relationship : null,
      status: form.status,
      start_date: form.startDate || todayISO(),
      end_date: form.endDate || null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    };

    let err;
    if (membership) {
      ({ error: err } = await supabase
        .from("patient_program_memberships")
        .update(payload)
        .eq("id", membership.id));
    } else {
      ({ error: err } = await supabase
        .from("patient_program_memberships")
        .insert(payload));
    }

    setSaving(false);
    if (err) {
      if (err.code === "23505") {
        setError("Este paciente já possui um vínculo ativo neste programa.");
      } else {
        setError(getErrorMessage(err));
      }
      return;
    }

    toast.success(membership ? "Vínculo atualizado." : "Paciente vinculado ao programa.");
    await loadMembership();
    setEditing(false);
  }

  // Pacientes elegíveis como titular (ativos, exceto o próprio paciente)
  const selectedProgram = programas.find((p) => p.id === form.programId);
  const holderCandidates = patients.filter(
    (p) => p.id !== patientId && p.status === "ativo" &&
      p.nome.toLowerCase().includes(holderSearch.toLowerCase())
  );
  const selectedHolder = form.holderPatientId
    ? patients.find((p) => p.id === form.holderPatientId)
    : null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando programa...
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface-low p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
            <Percent className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-ink">Programa de Desconto</p>
        </div>
        {!readonly && !editing && programas.length > 0 && (
          membership ? (
            <button
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-ink-secondary transition hover:border-primary hover:text-primary"
              type="button"
              onClick={openEdit}
            >
              Editar vínculo
            </button>
          ) : (
            <button
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-primary-dark"
              type="button"
              onClick={openCreate}
            >
              + Vincular
            </button>
          )
        )}
      </div>

      {/* Badge / info (modo leitura) */}
      {!editing && (
        <>
          {membership ? (
            <div className="space-y-3">
              <ProgramBadge membership={membership} programas={programas} patients={patients} />
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <div className="flex justify-between text-ink-secondary">
                  <span>Status</span>
                  <span className="font-medium text-ink">{STATUS_LABELS[membership.status]}</span>
                </div>
                <div className="flex justify-between text-ink-secondary">
                  <span>Entrada</span>
                  <span className="font-medium text-ink">
                    {new Date(`${membership.startDate}T12:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                {membership.endDate && (
                  <div className="flex justify-between text-ink-secondary">
                    <span>Saída</span>
                    <span className="font-medium text-ink">
                      {new Date(`${membership.endDate}T12:00:00`).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                )}
                {membership.relationship && (
                  <div className="flex justify-between text-ink-secondary">
                    <span>Parentesco</span>
                    <span className="font-medium text-ink">{RELATIONSHIP_LABELS[membership.relationship]}</span>
                  </div>
                )}
                {membership.notes && (
                  <div className="col-span-2 text-xs text-ink-muted">{membership.notes}</div>
                )}
              </div>

              {/* Dependentes (se for titular) */}
              {membership.role === "holder" && dependents.length > 0 && (
                <div className="mt-2 rounded-lg border border-border bg-white p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-secondary">
                    <Users className="h-3.5 w-3.5" />
                    {dependents.length} dependente{dependents.length !== 1 ? "s" : ""}
                  </div>
                  <div className="space-y-1">
                    {dependents.map((dep) => {
                      const depPatient = patients.find((p) => p.id === dep.patientId);
                      return (
                        <div key={dep.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-ink">{depPatient?.nome ?? dep.patientId}</span>
                          {dep.relationship && (
                            <span className="text-xs text-ink-muted">{RELATIONSHIP_LABELS[dep.relationship]}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : programas.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Nenhum programa cadastrado ainda. Acesse{" "}
              <span className="font-medium text-ink">Programas de Descontos</span>{" "}
              no menu para criar o primeiro.
            </p>
          ) : (
            <p className="text-sm text-ink-muted">
              {readonly ? "Nenhum programa vinculado." : "Nenhum programa vinculado. Clique em \"+ Vincular\" para associar."}
            </p>
          )}
        </>
      )}

      {/* Formulário de edição */}
      {editing && (
        <div className="space-y-3 border-t border-border pt-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Programa *">
              <select
                className={inputClass()}
                value={form.programId}
                onChange={(e) => setForm({ ...form, programId: e.target.value })}
              >
                {programas.filter((p) => p.ativo).map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
                {programas.filter((p) => !p.ativo).map((p) => (
                  <option key={p.id} value={p.id} disabled>{p.nome} (inativo)</option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de vínculo *">
              <select
                className={inputClass()}
                value={form.role}
                onChange={(e) => {
                  setForm({ ...form, role: e.target.value as MembershipRole, holderPatientId: "", relationship: "" });
                  setHolderSearch("");
                }}
              >
                <option value="holder">Titular</option>
                <option value="dependent">Dependente</option>
              </select>
            </Field>
          </div>

          {/* Autocomplete de titular (só aparece se dependente) */}
          {form.role === "dependent" && (
            <Field label="Paciente titular *">
              <div className="relative" ref={holderRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  <input
                    className={`${inputClass()} pl-8`}
                    placeholder="Buscar paciente titular..."
                    value={holderSearch}
                    onChange={(e) => {
                      setHolderSearch(e.target.value);
                      setForm({ ...form, holderPatientId: "" });
                      setHolderDropdownOpen(true);
                    }}
                    onFocus={() => setHolderDropdownOpen(true)}
                  />
                  {selectedHolder && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                      type="button"
                      onClick={() => { setForm({ ...form, holderPatientId: "" }); setHolderSearch(""); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {holderDropdownOpen && holderSearch.length >= 1 && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border bg-white shadow-lg">
                    {holderCandidates.length === 0 ? (
                      <p className="px-3 py-2.5 text-sm text-ink-muted">Nenhum paciente encontrado.</p>
                    ) : (
                      holderCandidates.slice(0, 10).map((p) => (
                        <button
                          key={p.id}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-low"
                          type="button"
                          onClick={() => {
                            setForm({ ...form, holderPatientId: p.id });
                            setHolderSearch(p.nome);
                            setHolderDropdownOpen(false);
                          }}
                        >
                          <span className="font-medium text-ink">{p.nome}</span>
                          <span className="text-xs text-ink-muted">{p.whatsapp}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedHolder && (
                <p className="mt-1 text-xs text-emerald-600 font-medium">
                  ✓ {selectedHolder.nome} selecionado(a)
                </p>
              )}
            </Field>
          )}

          {form.role === "dependent" && (
            <Field label="Grau de parentesco">
              <select
                className={inputClass()}
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value as MembershipRelationship | "" })}
              >
                <option value="">Não informar</option>
                {(Object.entries(RELATIONSHIP_LABELS) as [MembershipRelationship, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Status">
              <select
                className={inputClass()}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as MembershipStatus })}
              >
                {(Object.entries(STATUS_LABELS) as [MembershipStatus, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Data de entrada">
              <input
                className={inputClass()}
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </Field>
            <Field label="Data de saída">
              <input
                className={inputClass()}
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Observações internas">
            <textarea
              className={`${inputClass()} resize-none`}
              rows={2}
              value={form.notes}
              placeholder="Notas sobre este vínculo..."
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>

          <div className="flex justify-between gap-2 pt-1">
            {membership && (
              <button
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                type="button"
                disabled={saving}
                onClick={() => void handleRemove()}
              >
                Remover vínculo
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-secondary transition hover:bg-surface-low"
                type="button"
                onClick={() => { setEditing(false); setError(null); }}
              >
                Cancelar
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                {membership ? "Atualizar" : "Vincular"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
