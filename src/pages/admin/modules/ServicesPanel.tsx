import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { confirmDangerAction } from "../../../lib/confirmDangerAction";
import { brl } from "../../../lib/formatters";
import type { Professional, Service } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";
import { RefinedTable } from "../components/RefinedTable";

export function ServicesPanel({ services, professionals, onSave, onDelete }: { readonly services: Service[]; readonly professionals: Professional[]; readonly onSave: (values: Pick<Service, "nome" | "duracaoMin" | "preco" | "profissionalId" | "ativo"> & { id?: string }) => Promise<void>; readonly onDelete: (id: string) => Promise<void> }) {
  const [form, setForm] = useState({ id: "", nome: "", duracaoMin: 30, preco: 150, profissionalId: professionals[0]?.id ?? "" });
  const [filters, setFilters] = useState({ search: "", professionalId: "todos" });
  const filteredServices = services.filter((service) => {
    const matchesSearch = service.nome.toLowerCase().includes(filters.search.toLowerCase()) || (service.profissionalNome ?? "").toLowerCase().includes(filters.search.toLowerCase());
    const matchesProfessional = filters.professionalId === "todos" || service.profissionalId === filters.professionalId;
    return matchesSearch && matchesProfessional;
  });
  return (
    <SectionCard title="Serviços" description="Procedimentos e consultas oferecidos pela clínica.">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_240px]">
        <Field label="Filtrar serviços"><input className={inputClass()} placeholder="Nome ou profissional" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></Field>
        <Field label="Profissional"><select className={inputClass()} value={filters.professionalId} onChange={(event) => setFilters({ ...filters, professionalId: event.target.value })}><option value="todos">Todos</option>{professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
      </div>
      <form className="mb-5 grid gap-3 md:grid-cols-[1fr_150px_150px_1fr_auto]" onSubmit={(event) => { event.preventDefault(); void onSave({ ...form, ativo: true }); setForm({ id: "", nome: "", duracaoMin: 30, preco: 150, profissionalId: professionals[0]?.id ?? "" }); }}>
        <Field label="Serviço"><input className={inputClass()} value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} required /></Field>
        <Field label="Duração (min)"><input className={inputClass()} type="number" value={form.duracaoMin} onChange={(event) => setForm({ ...form, duracaoMin: Number(event.target.value) })} /></Field>
        <Field label="Preço (R$)"><input className={inputClass()} type="number" value={form.preco} onChange={(event) => setForm({ ...form, preco: Number(event.target.value) })} /></Field>
        <Field label="Profissional"><select className={inputClass()} value={form.profissionalId} onChange={(event) => setForm({ ...form, profissionalId: event.target.value })}>{professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
        <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark transition" type="submit"><Plus className="h-4 w-4" />{form.id ? "Atualizar" : "Adicionar"}</button>
      </form>
      {filteredServices.length === 0 ? <EmptyState title="Nenhum serviço cadastrado" message="Crie um serviço para liberar agendamentos na clínica." /> : <RefinedTable headers={["Serviço", "Profissional", "Duração", "Preço", "Ações"]}>{filteredServices.map((service) => <tr className="border-b border-surface-variant hover:bg-teal-50/60 transition" key={service.id}><td className="px-4 py-3 font-medium">{service.nome}</td><td className="px-4 py-3 text-secondary">{service.profissionalNome ?? "-"}</td><td className="px-4 py-3 text-secondary">{service.duracaoMin} min</td><td className="px-4 py-3 text-right font-semibold text-on-surface">{brl.format(service.preco)}</td><td className="px-4 py-3 text-right"><button className="mr-2 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary transition" onClick={() => setForm({ id: service.id, nome: service.nome, duracaoMin: service.duracaoMin, preco: service.preco, profissionalId: service.profissionalId ?? "" })} type="button">Editar</button><button aria-label={`Excluir serviço ${service.nome}`} className="rounded-lg p-1.5 text-secondary hover:bg-red-50 hover:text-error transition" onClick={() => { if (confirmDangerAction(`Tem certeza que deseja excluir este serviço ${service.nome}? Essa ação não pode ser desfeita.`)) void onDelete(service.id); }} type="button"><Trash2 className="h-4 w-4" /></button></td></tr>)}</RefinedTable>}
    </SectionCard>
  );
}
