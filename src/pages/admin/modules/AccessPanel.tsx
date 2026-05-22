import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Trash2, X } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
import { supabase } from "../../../lib/supabaseClient";
import { toast } from "../../../lib/toast";
import type { ClinicUser, Professional, UserRole } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";
import { RefinedTable } from "../components/RefinedTable";
import { StatusPill } from "../components/StatusPill";

export function AccessPanel({ users, professionals, onCreate, onSave, onDelete }: {
  readonly users: ClinicUser[];
  readonly professionals: Professional[];
  readonly onCreate: (values: { nome: string; email: string; password: string; role: UserRole; profissionalId?: string | null; professional?: { especialidade: string; telefone?: string | null; registro?: string | null; conselho?: string | null; fotoUrl?: string | null } }) => Promise<void>;
  readonly onSave: (values: Omit<ClinicUser, "id" | "clinicaId"> & { id?: string }) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState({ nome: "", email: "", password: "", role: "secretaria" as UserRole, profissionalId: "", especialidade: "", telefone: "", registro: "", conselho: "CRM", fotoUrl: "" });
  const [editingUser, setEditingUser] = useState<ClinicUser | null>(null);
  const isProfessional = form.role === "profissional";

  return (
    <SectionCard title="Acessos" description="Crie usuários do SaaS com e-mail, senha e permissões por clínica. A chave service_role fica somente na Edge Function.">
      <form className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-8" onSubmit={(event) => {
        event.preventDefault();
        void onCreate({
          nome: form.nome,
          email: form.email,
          password: form.password,
          role: form.role,
          profissionalId: form.profissionalId || null,
          professional: isProfessional ? { especialidade: form.especialidade || "Profissional", telefone: form.telefone, registro: form.registro, conselho: form.conselho, fotoUrl: form.fotoUrl } : undefined
        });
        setForm({ nome: "", email: "", password: "", role: "secretaria", profissionalId: "", especialidade: "", telefone: "", registro: "", conselho: "CRM", fotoUrl: "" });
      }}>
        <Field label="Nome"><input className={inputClass()} value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} required /></Field>
        <Field label="E-mail"><input className={inputClass()} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field>
        <Field label="Senha"><input className={inputClass()} minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></Field>
        <Field label="Perfil"><select className={inputClass()} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}><option value="admin">Admin</option><option value="profissional">Profissional</option><option value="secretaria">Secretária</option></select></Field>
        {isProfessional ? <Field label="Profissional existente"><select className={inputClass()} value={form.profissionalId} onChange={(event) => setForm({ ...form, profissionalId: event.target.value })}><option value="">Criar novo</option>{professionals.map((professional) => <option value={professional.id} key={professional.id}>{professional.nome}</option>)}</select></Field> : <div />}
        {isProfessional && !form.profissionalId ? <Field label="Especialidade"><input className={inputClass()} value={form.especialidade} onChange={(event) => setForm({ ...form, especialidade: event.target.value })} /></Field> : <div />}
        {isProfessional && !form.profissionalId ? <Field label="Registro"><input className={inputClass()} value={form.registro} onChange={(event) => setForm({ ...form, registro: event.target.value })} /></Field> : <div />}
        <button className="mt-5 h-10 rounded bg-primary px-4 text-sm font-medium text-white" type="submit">Criar usuário</button>
      </form>

      {users.length === 0 ? <EmptyState title="Nenhum acesso adicional" message="Crie profissionais, secretárias ou outros administradores para operar o SaaS." /> : (
        <RefinedTable headers={["Nome", "E-mail", "Perfil", "Profissional", "Status", ""]}>
          {users.map((user) => (
            <tr className="border-b border-surface-variant hover:bg-teal-50" key={user.id}>
              <td className="px-4 py-3 font-medium">{user.nome}</td>
              <td className="px-4 py-3">{user.email}</td>
              <td className="px-4 py-3 capitalize">{user.role}</td>
              <td className="px-4 py-3">{professionals.find((professional) => professional.id === user.profissionalId)?.nome ?? "-"}</td>
              <td className="px-4 py-3"><StatusPill value={user.ativo ? "ativo" : "inativo"} /></td>
              <td className="px-4 py-3 text-right">
                <button
                  className="mr-2 rounded border border-outline-variant px-2 py-1 text-xs"
                  onClick={() => void onSave({ ...user, ativo: !user.ativo })}
                  type="button"
                >
                  {user.ativo ? "Desativar" : "Ativar"}
                </button>
                {user.userId && (
                  <button
                    className="mr-2 inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/5 px-2 py-1 text-xs text-primary hover:bg-primary/10"
                    onClick={() => setEditingUser(user)}
                    title="Editar login"
                    type="button"
                  >
                    <KeyRound className="h-3 w-3" />
                    Login
                  </button>
                )}
                <button
                  aria-label={`Excluir usuário ${user.nome}`}
                  onClick={() => void confirmDangerAction(`Tem certeza que deseja excluir este usuário ${user.nome}? Essa ação não pode ser desfeita.`).then((ok) => { if (ok) onDelete(user.id); })}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </RefinedTable>
      )}

      {editingUser && (
        <EditCredentialsModal
          userName={editingUser.nome}
          targetUserId={editingUser.userId!}
          currentEmail={editingUser.email}
          onClose={() => setEditingUser(null)}
        />
      )}
    </SectionCard>
  );
}

/* ─── Modal de edição de credenciais ─── */

function EditCredentialsModal({
  userName,
  targetUserId,
  currentEmail,
  onClose,
}: {
  userName: string;
  targetUserId: string;
  currentEmail: string;
  onClose: () => void;
}) {
  const [newEmail, setNewEmail] = useState(currentEmail);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, string> = { targetUserId };
      if (newEmail.trim() && newEmail.trim() !== currentEmail) body.newEmail = newEmail.trim();
      if (newPassword.trim()) body.newPassword = newPassword.trim();
      if (!body.newEmail && !body.newPassword) {
        setError("Nenhuma alteração detectada.");
        setSaving(false);
        return;
      }
      const { data, error: fnError } = await supabase.functions.invoke("update-user-credentials", { body });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      toast.success("Credenciais atualizadas com sucesso!");
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Erro ao atualizar credenciais.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface shadow-modal">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-semibold text-ink">Editar login</h2>
            <p className="mt-0.5 text-xs text-ink-secondary">{userName}</p>
          </div>
          <button className="rounded-xl p-1.5 text-ink-muted hover:bg-surface-low" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="space-y-4 p-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="edit-email">Novo e-mail</label>
            <input
              className="w-full rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-ink-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
              id="edit-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="edit-password">Nova senha <span className="text-ink-muted">(deixe em branco para não alterar)</span></label>
            <div className="relative">
              <input
                className="w-full rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-ink-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                id="edit-password"
                placeholder="Mínimo 8 caracteres"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                onClick={() => setShowPassword((v) => !v)}
                type="button"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 rounded-2xl border border-border-strong py-2.5 text-sm font-medium text-ink-secondary hover:bg-surface-low"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
