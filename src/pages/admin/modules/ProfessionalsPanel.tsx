import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
import type { Professional, UserRole } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";

export function ProfessionalsPanel({ professionals, onSave, onDelete, onCreateAccess }: { readonly professionals: Professional[]; readonly onSave: (values: Pick<Professional, "nome" | "especialidade" | "email" | "telefone" | "registro" | "conselho" | "fotoUrl" | "ativo"> & { id?: string }) => Promise<void>; readonly onDelete: (id: string) => Promise<void>; readonly onCreateAccess: (values: { nome: string; email: string; password: string; role: UserRole; profissionalId?: string | null; professional?: { especialidade: string; telefone?: string | null; registro?: string | null; conselho?: string | null; fotoUrl?: string | null } }) => Promise<void> }) {
  const emptyForm = { id: "", nome: "", especialidade: "", email: "", senha: "", telefone: "", registro: "", conselho: "CRM", fotoUrl: "" };
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const filteredProfessionals = professionals.filter((professional) => `${professional.nome} ${professional.especialidade} ${professional.email ?? ""} ${professional.registro ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <SectionCard title="Profissionais" description="Gerencie equipe clínica, registro profissional, contato, foto e especialidades.">
      <div className="mb-4">
        <Field label="Filtrar profissionais"><input className={inputClass()} placeholder="Nome, especialidade, e-mail ou registro" value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
      </div>
      <form className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-8" onSubmit={(event) => {
        event.preventDefault();
        if (form.id) {
          void onSave({ id: form.id, nome: form.nome, especialidade: form.especialidade, email: form.email, telefone: form.telefone, registro: form.registro, conselho: form.conselho, fotoUrl: form.fotoUrl, ativo: true });
        } else if (form.email && form.senha) {
          void onCreateAccess({ nome: form.nome, email: form.email, password: form.senha, role: "profissional", professional: { especialidade: form.especialidade, telefone: form.telefone, registro: form.registro, conselho: form.conselho, fotoUrl: form.fotoUrl } });
        } else {
          void onSave({ ...form, ativo: true });
        }
        setForm(emptyForm);
      }}>
        <Field label="Nome"><input className={inputClass()} value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} required /></Field>
        <Field label="Especialidade"><input className={inputClass()} value={form.especialidade} onChange={(event) => setForm({ ...form, especialidade: event.target.value })} required /></Field>
        <Field label="E-mail"><input className={inputClass()} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <Field label="Senha de acesso"><input className={inputClass()} minLength={8} type="password" value={form.senha} onChange={(event) => setForm({ ...form, senha: event.target.value })} placeholder="Opcional" /></Field>
        <Field label="Telefone"><input className={inputClass()} value={form.telefone} onChange={(event) => setForm({ ...form, telefone: event.target.value })} /></Field>
        <Field label="Conselho"><select className={inputClass()} value={form.conselho} onChange={(event) => setForm({ ...form, conselho: event.target.value })}><option>CRM</option><option>CRO</option><option>CRP</option><option>CREFITO</option><option>COREN</option><option>Outro</option></select></Field>
        <Field label="Registro"><input className={inputClass()} value={form.registro} onChange={(event) => setForm({ ...form, registro: event.target.value })} /></Field>
        <Field label="Foto URL"><input className={inputClass()} value={form.fotoUrl} onChange={(event) => setForm({ ...form, fotoUrl: event.target.value })} /></Field>
        <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-medium text-white" type="submit"><Plus className="h-4 w-4" />{form.id ? "Atualizar" : form.email && form.senha ? "Criar com acesso" : "Adicionar"}</button>
      </form>
      {filteredProfessionals.length === 0 ? <EmptyState title="Nenhum profissional" message="Cadastre o primeiro profissional para abrir a agenda." /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredProfessionals.map((professional) => (
            <article className="flex items-center justify-between rounded-lg border border-surface-variant bg-white p-4" key={professional.id}>
              <div className="flex items-center gap-3">
                {professional.fotoUrl ? <img alt="" className="h-10 w-10 rounded-full object-cover" src={professional.fotoUrl} /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">{professional.nome.slice(0, 1)}</div>}
                <div><p className="font-semibold text-on-surface">{professional.nome}</p><p className="text-sm text-secondary">{professional.especialidade} · {professional.conselho ?? ""} {professional.registro ?? ""}</p><p className="text-xs text-secondary">{professional.email ?? ""} {professional.telefone ?? ""}</p></div>
              </div>
              <div className="flex gap-2">
                <button className="rounded border border-outline-variant px-2 py-1 text-xs" onClick={() => setForm({ id: professional.id, nome: professional.nome, especialidade: professional.especialidade, email: professional.email ?? "", senha: "", telefone: professional.telefone ?? "", registro: professional.registro ?? "", conselho: professional.conselho ?? "CRM", fotoUrl: professional.fotoUrl ?? "" })} type="button">Editar</button>
                <button aria-label={`Excluir profissional ${professional.nome}`} className="rounded p-2 text-secondary hover:bg-red-50 hover:text-error" onClick={() => void confirmDangerAction(`Tem certeza que deseja excluir este profissional ${professional.nome}? Essa ação não pode ser desfeita.`).then((ok) => { if (ok) onDelete(professional.id); })} type="button"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
