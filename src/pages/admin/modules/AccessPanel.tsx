import { useState } from "react";
import { Trash2 } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
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
                <button className="mr-2 rounded border border-outline-variant px-2 py-1 text-xs" onClick={() => void onSave({ ...user, ativo: !user.ativo })} type="button">{user.ativo ? "Desativar" : "Ativar"}</button>
                <button aria-label={`Excluir usuário ${user.nome}`} onClick={() => void confirmDangerAction(`Tem certeza que deseja excluir este usuário ${user.nome}? Essa ação não pode ser desfeita.`).then((ok) => { if (ok) onDelete(user.id); })} type="button"><Trash2 className="h-4 w-4" /></button>
              </td>
            </tr>
          ))}
        </RefinedTable>
      )}
    </SectionCard>
  );
}
