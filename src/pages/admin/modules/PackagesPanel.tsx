import { useState } from "react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import type { Patient, Service, SessionPackage } from "../../../types/clinic";
import { Field, inputClass } from "../components/Field";
import { StatusPill } from "../components/StatusPill";

export function PackagesPanel({ packages, patients, services, onSave, onRegister }: { readonly packages: SessionPackage[]; readonly patients: Patient[]; readonly services: Service[]; readonly onSave: (values: { pacienteId?: string | null; servicoId?: string | null; totalSessoes: number }) => Promise<void>; readonly onRegister: (pkg: SessionPackage) => Promise<void> }) {
  const [form, setForm] = useState({ pacienteId: patients[0]?.id ?? "", servicoId: services[0]?.id ?? "", totalSessoes: 10 });
  return (
    <SectionCard title="Pacotes &amp; Sessões" description="Controle de saldo de sessões, validade e progresso de cada pacote.">
      <form className="mb-5 grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]" onSubmit={(event) => { event.preventDefault(); void onSave(form); }}>
        <Field label="Paciente"><select className={inputClass()} value={form.pacienteId} onChange={(event) => setForm({ ...form, pacienteId: event.target.value })}>{patients.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
        <Field label="Serviço"><select className={inputClass()} value={form.servicoId} onChange={(event) => setForm({ ...form, servicoId: event.target.value })}>{services.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
        <Field label="Sessões"><input className={inputClass()} type="number" value={form.totalSessoes} onChange={(event) => setForm({ ...form, totalSessoes: Number(event.target.value) })} /></Field>
        <button className="mt-5 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark transition" type="submit">Criar Pacote</button>
      </form>
      {packages.length === 0 ? <EmptyState title="Nenhum pacote ativo" message="Crie um pacote para controlar sessões e progresso do paciente." /> : <div className="space-y-3">{packages.map((pkg) => <article className="rounded-xl border border-surface-variant bg-white p-4 transition hover:shadow-clinical" key={pkg.id}><div className="flex justify-between gap-4"><div><p className="font-semibold text-on-surface">{pkg.paciente}</p><p className="text-sm text-secondary">{pkg.servico}</p></div><button className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium hover:border-primary hover:text-primary transition" onClick={() => void onRegister(pkg)} type="button">Registrar Sessão</button></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((pkg.sessoesRealizadas / pkg.totalSessoes) * 100)}%` }} /></div><p className="mt-2 text-xs text-secondary">{pkg.sessoesRealizadas}/{pkg.totalSessoes} sessões · <StatusPill value={pkg.status} /></p></article>)}</div>}
    </SectionCard>
  );
}
