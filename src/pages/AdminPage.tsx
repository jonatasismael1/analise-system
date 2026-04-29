import React, { useEffect, useMemo, useState, useRef } from "react";
import { LogOut, Plus, RefreshCcw, Trash2, Bot, Sparkles, Check, Copy, MessageSquare, Clock, Target } from "lucide-react";
import { Navigate } from "react-router-dom";
import { AdminShell } from "../components/layout/AdminShell";
import { EmptyState } from "../components/ui/EmptyState";
import { SectionCard } from "../components/ui/SectionCard";
import { useAuth } from "../contexts/AuthContext";
import { useClinicData } from "../hooks/useClinicData";
import { calculateGrowthInsights, buildWhatsAppMessage } from "../lib/aiGrowth";
import { brl, todayISO, whatsappUrl } from "../lib/formatters";
import type { Appointment, ClinicUser, FinanceEntry, Patient, Professional, Service, UserRole } from "../types/clinic";
import ExportPage from "./ExportPage";
import { ProntuarioTimeline } from "../components/Prontuario/ProntuarioTimeline";

const modules = [
  "Dashboard",
  "Profissionais",
  "Serviços",
  "Agendamentos",
  "Pacientes",
  "Kanban Pacientes",
  "Financeiro",
  "Pacotes & Sessões",
  "Relatórios",
  "AI Growth Engine",
  "Acessos"
] as const;

type Module = (typeof modules)[number];

function Field({ label, children }: { readonly label: string; readonly children: JSX.Element }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function inputClass() {
  return "mt-1 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";
}

const STATUS_LABELS: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
  confirmado: "Confirmado",
  concluido: "Concluído",
  faltou: "Faltou",
  ativo: "Ativo",
  inativo: "Inativo",
  retorno_pendente: "Retorno pendente",
  ociosidade: "Ociosidade",
  retorno: "Retorno",
  falta: "Falta",
  financeiro: "Financeiro",
};

function StatusPill({ value }: { readonly value: string }) {
  const tone =
    value === "pago" || value === "confirmado" || value === "ativo"
      ? "bg-teal-50 text-primary border border-teal-200"
      : value === "atrasado" || value === "faltou" || value === "cancelado"
      ? "bg-red-50 text-error border border-red-200"
      : value === "pendente"
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : value === "concluido"
      ? "bg-blue-50 text-blue-700 border border-blue-200"
      : "bg-slate-100 text-secondary border border-slate-200";
  const label = STATUS_LABELS[value] ?? value.replace(/_/g, " ");
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>;
}

function DataMessage({ loading, message }: { readonly loading: boolean; readonly message: string | null }) {
  if (loading) return <div className="rounded border border-outline-variant bg-white px-4 py-3 text-sm text-secondary">Carregando dados...</div>;
  if (message) return <div className="rounded border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-primary-dark">{message}</div>;
  return null;
}

export function AdminPage() {
  const { clinic, logout, loading, role, profile } = useAuth();
  const [activeModule, setActiveModule] = useState<Module>("Dashboard");
  const data = useClinicData(clinic?.id, role, profile?.profissionalId);
  const visibleModules = useMemo(() => modules.filter((module) => {
    if (role === "admin") return true;
    if (role === "secretaria") return !["Financeiro", "AI Growth Engine", "Acessos"].includes(module);
    return ["Dashboard", "Agendamentos", "Pacientes", "Kanban Pacientes"].includes(module);
  }), [role]);

  const insights = useMemo(() => calculateGrowthInsights({
    professionals: data.professionals,
    appointments: data.appointments,
    patients: data.patients,
    financeEntries: data.financeEntries,
    services: data.services
  }), [data.appointments, data.financeEntries, data.patients, data.professionals, data.services]);

  useEffect(() => {
    if (!visibleModules.includes(activeModule)) {
      setActiveModule(visibleModules[0] ?? "Dashboard");
    }
  }, [activeModule, visibleModules]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-secondary">Carregando painel...</p>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminShell activeModule={activeModule} onModuleChange={setActiveModule} modules={[...visibleModules]} onLogout={logout} clinicaId={clinic?.id}>
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-surface-variant pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-primary">Clinic Pro</p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight text-on-surface">{activeModule}</h1>
          <p className="mt-1 text-sm text-secondary">{clinic?.nome ?? "Clínica"} · Administração precisa · Perfil: {role}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex h-10 items-center gap-2 rounded border border-outline-variant bg-white px-3 text-sm font-medium text-secondary hover:bg-surface-container-low" onClick={() => void data.reload()} type="button">
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded bg-primary px-3 text-sm font-medium text-white hover:bg-primary-dark" onClick={() => void logout()} type="button">
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <DataMessage loading={data.loading} message={data.message} />
        {activeModule === "Dashboard" ? <DashboardPanel appointments={data.appointments} professionals={data.professionals} patients={data.patients} kpis={data.financialKpis} insightsCount={insights.length} /> : null}
        {activeModule === "Profissionais" ? <ProfessionalsPanel professionals={data.professionals} onSave={data.saveProfessional} onDelete={data.deleteProfessional} onCreateAccess={data.createStaffUser} /> : null}
        {activeModule === "Serviços" ? <ServicesPanel services={data.services} professionals={data.professionals} onSave={data.saveService} onDelete={data.deleteService} /> : null}
        {activeModule === "Agendamentos" ? <AppointmentsPanel appointments={data.appointments} patients={data.patients} professionals={data.professionals} services={data.services} onSave={data.saveAppointment} onDelete={data.deleteAppointment} /> : null}
        {activeModule === "Pacientes" ? <PatientsPanel patients={data.patients} professionals={data.professionals} onSave={data.savePatient} onDelete={data.deletePatient} onImportMassively={data.importPatientsMassively} /> : null}
        {activeModule === "Kanban Pacientes" ? <PatientKanbanPanel patients={data.patients} appointments={data.appointments} professionals={data.professionals} onSave={data.savePatient} /> : null}
        {activeModule === "Financeiro" ? <FinancePanel entries={data.financeEntries} kpis={data.financialKpis} onPayment={data.savePayment} onExpense={data.saveExpense} onUpdatePayment={data.updatePayment} onUpdateExpense={data.updateExpense} onDeletePayment={data.deletePayment} onDeleteExpense={data.deleteExpense} professionals={data.professionals} clinicaNome={clinic?.nome ?? "Clinic Pro"} /> : null}
        {activeModule === "Pacotes & Sessões" ? <PackagesPanel packages={data.packages} patients={data.patients} services={data.services} onSave={data.savePackage} onRegister={data.registerSession} /> : null}
        {activeModule === "Relatórios" ? <ReportsPanel appointments={data.appointments} patients={data.patients} professionals={data.professionals} services={data.services} entries={data.financeEntries} /> : null}
        {activeModule === "AI Growth Engine" ? <AIPanel insights={insights} clinicName={clinic?.nome ?? "Clinic Pro"} /> : null}
        {activeModule === "Acessos" ? <AccessPanel users={data.users} professionals={data.professionals} onCreate={data.createStaffUser} onSave={data.saveUser} onDelete={data.deleteUser} /> : null}
      </div>
    </AdminShell>
  );
}

function DashboardPanel({ appointments, professionals, patients, kpis, insightsCount }: { readonly appointments: Appointment[]; readonly professionals: Professional[]; readonly patients: Patient[]; readonly kpis: { revenue: number; forecast: number; overdue: number; profit: number }; readonly insightsCount: number }) {
  const cards = [
    { label: "Total de Consultas", value: appointments.length.toString(), detail: "Todos os períodos", color: "text-primary" },
    { label: "Ocupação Média", value: `${Math.min(100, Math.round((appointments.filter((item) => item.status === "confirmado").length / Math.max(professionals.length * 40, 1)) * 100))}%`, detail: "agenda semanal", color: "text-blue-600" },
    { label: "Profissionais Ativos", value: professionals.filter((item) => item.ativo).length.toString(), detail: "em operação", color: "text-teal-600" },
    { label: "Receita Prevista", value: brl.format(kpis.forecast), detail: `${brl.format(kpis.overdue)} em atraso`, color: kpis.overdue > 0 ? "text-error" : "text-primary" },
  ];
  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, color }) => (
          <div className="group rounded-xl border border-surface-variant bg-white p-5 transition hover:border-primary/20 hover:shadow-clinical" key={label}>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">{label}</p>
            <p className={`mt-2 text-3xl font-bold tracking-tight text-on-surface`}>{value}</p>
            <p className={`mt-1.5 text-xs font-medium ${color}`}>{detail}</p>
          </div>
        ))}
      </section>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="Visão Geral Semanal">
          <div className="flex h-[240px] items-end gap-2 px-1">
            {[42, 66, 84, 55, 72, 31, 48].map((height, index) => (
              <div className="flex flex-1 flex-col items-center gap-1.5" key={index}>
                <div className="w-full rounded-t-md bg-primary/80 transition hover:bg-primary" style={{ height: `${height}%` }} />
                <span className="text-[10px] font-medium text-secondary">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][index]}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] text-secondary">Dados de demonstração</p>
        </SectionCard>
        <SectionCard title="AI Growth Engine">
          <div className="space-y-3">
            <p className="text-4xl font-bold tracking-tight text-on-surface">{insightsCount}</p>
            <p className="text-sm text-secondary">Oportunidades detectadas entre agenda, pacientes e financeiro.</p>
            <StatusPill value={patients.filter((item) => item.status !== "ativo").length ? "retorno_pendente" : "ativo"} />
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function ProfessionalsPanel({ professionals, onSave, onDelete, onCreateAccess }: { readonly professionals: Professional[]; readonly onSave: (values: Pick<Professional, "nome" | "especialidade" | "email" | "telefone" | "registro" | "conselho" | "fotoUrl" | "ativo"> & { id?: string }) => Promise<void>; readonly onDelete: (id: string) => Promise<void>; readonly onCreateAccess: (values: { nome: string; email: string; password: string; role: UserRole; profissionalId?: string | null; professional?: { especialidade: string; telefone?: string | null; registro?: string | null; conselho?: string | null; fotoUrl?: string | null } }) => Promise<void> }) {
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
                <button className="rounded p-2 text-secondary hover:bg-red-50 hover:text-error" onClick={() => void onDelete(professional.id)} type="button"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ServicesPanel({ services, professionals, onSave, onDelete }: { readonly services: Service[]; readonly professionals: Professional[]; readonly onSave: (values: Pick<Service, "nome" | "duracaoMin" | "preco" | "profissionalId" | "ativo"> & { id?: string }) => Promise<void>; readonly onDelete: (id: string) => Promise<void> }) {
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
      {filteredServices.length === 0 ? <EmptyState title="Nenhum serviço cadastrado" message="Crie um serviço para liberar agendamentos na clínica." /> : <RefinedTable headers={["Serviço", "Profissional", "Duração", "Preço", "Ações"]}>{filteredServices.map((service) => <tr className="border-b border-surface-variant hover:bg-teal-50/60 transition" key={service.id}><td className="px-4 py-3 font-medium">{service.nome}</td><td className="px-4 py-3 text-secondary">{service.profissionalNome ?? "-"}</td><td className="px-4 py-3 text-secondary">{service.duracaoMin} min</td><td className="px-4 py-3 text-right font-semibold text-on-surface">{brl.format(service.preco)}</td><td className="px-4 py-3 text-right"><button className="mr-2 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary transition" onClick={() => setForm({ id: service.id, nome: service.nome, duracaoMin: service.duracaoMin, preco: service.preco, profissionalId: service.profissionalId ?? "" })} type="button">Editar</button><button className="rounded-lg p-1.5 text-secondary hover:bg-red-50 hover:text-error transition" onClick={() => void onDelete(service.id)} type="button"><Trash2 className="h-4 w-4" /></button></td></tr>)}</RefinedTable>}
    </SectionCard>
  );
}

function AppointmentsPanel({ appointments, patients, professionals, services, onSave, onDelete }: { readonly appointments: Appointment[]; readonly patients: Patient[]; readonly professionals: Professional[]; readonly services: Service[]; readonly onSave: (values: { profissionalId: string; servicoId?: string | null; pacienteId?: string | null; pacienteNome: string; pacienteWhatsapp: string; data: string; horario: string; status: Appointment["status"] }) => Promise<void>; readonly onDelete: (id: string) => Promise<void> }) {
  const [form, setForm] = useState({ id: "", profissionalId: professionals[0]?.id ?? "", servicoId: services[0]?.id ?? "", pacienteId: patients[0]?.id ?? "", pacienteNome: "", pacienteWhatsapp: "", data: todayISO(), horario: "09:00", status: "confirmado" as Appointment["status"] });
  const [filters, setFilters] = useState({ search: "", status: "todos", professional: "todos", date: "" });
  const selectedPatient = patients.find((item) => item.id === form.pacienteId);
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = `${appointment.pacienteNome} ${appointment.profissional} ${appointment.servico}`.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "todos" || appointment.status === filters.status;
    const matchesProfessional = filters.professional === "todos" || appointment.profissional === professionals.find((item) => item.id === filters.professional)?.nome;
    const matchesDate = !filters.date || appointment.data === filters.date;
    return matchesSearch && matchesStatus && matchesProfessional && matchesDate;
  });
  return (
    <SectionCard title="Agendamentos" description="Agenda operacional filtrada pela clinica logada.">
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Field label="Buscar"><input className={inputClass()} placeholder="Paciente, profissional ou serviço" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></Field>
        <Field label="Status"><select className={inputClass()} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="todos">Todos</option><option value="pendente">Pendente</option><option value="confirmado">Confirmado</option><option value="concluido">Concluído</option><option value="faltou">Faltou</option><option value="cancelado">Cancelado</option></select></Field>
        <Field label="Profissional"><select className={inputClass()} value={filters.professional} onChange={(event) => setFilters({ ...filters, professional: event.target.value })}><option value="todos">Todos</option>{professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
        <Field label="Data"><input className={inputClass()} type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} /></Field>
      </div>
      <form className="mb-5 grid gap-3 md:grid-cols-4 xl:grid-cols-8" onSubmit={(event) => { event.preventDefault(); void onSave({ ...form, pacienteNome: form.pacienteNome || selectedPatient?.nome || "Paciente", pacienteWhatsapp: form.pacienteWhatsapp || selectedPatient?.whatsapp || "" }); setForm({ id: "", profissionalId: professionals[0]?.id ?? "", servicoId: services[0]?.id ?? "", pacienteId: patients[0]?.id ?? "", pacienteNome: "", pacienteWhatsapp: "", data: todayISO(), horario: "09:00", status: "confirmado" as Appointment["status"] }); }}>
        <Field label="Paciente"><select className={inputClass()} value={form.pacienteId} onChange={(event) => setForm({ ...form, pacienteId: event.target.value })}>{patients.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
        <Field label="Nome avulso"><input className={inputClass()} value={form.pacienteNome} onChange={(event) => setForm({ ...form, pacienteNome: event.target.value })} /></Field>
        <Field label="WhatsApp"><input className={inputClass()} value={form.pacienteWhatsapp} onChange={(event) => setForm({ ...form, pacienteWhatsapp: event.target.value })} /></Field>
        <Field label="Profissional"><select className={inputClass()} value={form.profissionalId} onChange={(event) => setForm({ ...form, profissionalId: event.target.value })}>{professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
        <Field label="Serviço"><select className={inputClass()} value={form.servicoId} onChange={(event) => setForm({ ...form, servicoId: event.target.value })}>{services.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
        <Field label="Data"><input className={inputClass()} type="date" value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} /></Field>
        <Field label="Horário"><input className={inputClass()} type="time" value={form.horario} onChange={(event) => setForm({ ...form, horario: event.target.value })} /></Field>
        <Field label="Status"><select className={inputClass()} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Appointment["status"] })}><option value="pendente">Pendente</option><option value="confirmado">Confirmado</option><option value="concluido">Concluído</option><option value="faltou">Faltou</option><option value="cancelado">Cancelado</option></select></Field>
        <button className="mt-5 h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark transition" type="submit">{form.id ? "Atualizar" : "Salvar"}</button>
      </form>
      <WeeklyCalendar appointments={filteredAppointments} />
      {filteredAppointments.length === 0 ? <EmptyState title="Sem agendamentos" message="Agendamentos públicos e internos aparecerão aqui." /> : <RefinedTable headers={["Paciente", "Profissional", "Serviço", "Data", "Status", "Ações"]}>{filteredAppointments.map((appointment) => <tr className="border-b border-surface-variant hover:bg-teal-50/60 transition" key={appointment.id}><td className="px-4 py-3 font-medium">{appointment.pacienteNome}</td><td className="px-4 py-3 text-secondary">{appointment.profissional}</td><td className="px-4 py-3 text-secondary">{appointment.servico}</td><td className="px-4 py-3 text-secondary">{new Date(`${appointment.data}T12:00:00`).toLocaleDateString("pt-BR")} {appointment.horario}</td><td className="px-4 py-3"><StatusPill value={appointment.status} /></td><td className="px-4 py-3 text-right"><button className="mr-2 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary transition" onClick={() => setForm({ id: appointment.id, profissionalId: professionals.find((item) => item.nome === appointment.profissional)?.id ?? "", servicoId: services.find((item) => item.nome === appointment.servico)?.id ?? "", pacienteId: "", pacienteNome: appointment.pacienteNome, pacienteWhatsapp: "", data: appointment.data, horario: appointment.horario, status: appointment.status })} type="button">Editar</button><button className="rounded-lg p-1.5 text-secondary hover:bg-red-50 hover:text-error transition" onClick={() => void onDelete(appointment.id)} type="button"><Trash2 className="h-4 w-4" /></button></td></tr>)}</RefinedTable>}
    </SectionCard>
  );
}

function WeeklyCalendar({ appointments }: { readonly appointments: Appointment[] }) {
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date.toISOString().slice(0, 10);
  });

  const statusCardClass: Record<string, string> = {
    confirmado: "bg-teal-50 border border-teal-200 text-primary",
    concluido: "bg-blue-50 border border-blue-200 text-blue-700",
    pendente: "bg-amber-50 border border-amber-200 text-amber-700",
    faltou: "bg-red-50 border border-red-200 text-error",
    cancelado: "bg-slate-100 border border-slate-200 text-secondary line-through",
  };

  return (
    <div className="mb-5 rounded-xl border border-surface-variant bg-white p-4 shadow-clinical">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-on-surface">Calendário Semanal</h3>
        <div className="flex items-center gap-3 text-[10px] font-medium">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" />Confirmado</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Pendente</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-error" />Faltou</span>
          <span className="text-secondary">Próximos 7 dias</span>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-7">
        {week.map((date) => {
          const dayAppointments = appointments.filter((item) => item.data === date).sort((a, b) => a.horario.localeCompare(b.horario));
          const isToday = date === new Date().toISOString().slice(0, 10);
          return (
            <div
              className={`min-h-[160px] rounded-lg border p-2 transition ${
                isToday ? "border-primary bg-teal-50/30" : "border-surface-variant bg-surface-container-lowest"
              }`}
              key={date}
            >
              <p className={`mb-2 text-[10px] font-bold uppercase tracking-wide ${
                isToday ? "text-primary" : "text-secondary"
              }`}>
                {new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                {isToday && <span className="ml-1 rounded-full bg-primary px-1 py-0.5 text-[9px] text-white">Hoje</span>}
              </p>
              <div className="space-y-1.5">
                {dayAppointments.length === 0 ? (
                  <p className="text-[10px] italic text-secondary/70">Livre</p>
                ) : (
                  dayAppointments.map((item) => (
                    <div
                      className={`rounded-md p-1.5 text-[10px] leading-tight ${
                        statusCardClass[item.status] ?? "bg-slate-50 border border-slate-200 text-secondary"
                      }`}
                      key={item.id}
                    >
                      <p className="font-bold">{item.horario} • {item.pacienteNome}</p>
                      <p className="mt-0.5 opacity-80">{item.profissional}</p>
                      <p className="opacity-70">{item.servico}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatientsPanel({ patients, professionals, onSave, onDelete, onImportMassively }: { readonly patients: Patient[]; readonly professionals: Professional[]; readonly onSave: (values: Patient) => Promise<void>; readonly onDelete: (id: string) => Promise<void>; readonly onImportMassively: (patients: Omit<Patient, "id" | "clinicaId">[]) => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState<Patient>({ id: "", nome: "", whatsapp: "", email: "", cpf: "", dataNascimento: "", endereco: "", status: "ativo", valorTotalGasto: 0, profissionalId: professionals[0]?.id ?? null, observacoes: "" });
  const [filters, setFilters] = useState({ search: "", status: "todos", professionalId: "todos" });
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = `${patient.nome} ${patient.whatsapp} ${patient.email ?? ""} ${patient.cpf ?? ""}`.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "todos" || patient.status === filters.status;
    const matchesProfessional = filters.professionalId === "todos" || patient.profissionalId === filters.professionalId;
    return matchesSearch && matchesStatus && matchesProfessional;
  });

  if (selectedPatient) {
    return (
      <div className="space-y-4">
        <button
          className="text-sm text-secondary hover:text-primary transition"
          onClick={() => setSelectedPatient(null)}
        >
          ← Voltar para lista de pacientes
        </button>
        <ProntuarioTimeline patient={selectedPatient} professionals={professionals} />
      </div>
    );
  }

  return (
    <SectionCard title="Pacientes" description="Dados cadastrais, CPF, endereço, retorno e vínculo com profissional.">
      <div className="mb-4 flex flex-col md:flex-row gap-3 justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-3">
          <Field label="Buscar paciente"><input className={inputClass()} placeholder="Nome, WhatsApp, e-mail ou CPF" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></Field>
          <Field label="Status"><select className={inputClass()} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="todos">Todos</option><option value="ativo">Ativo</option><option value="retorno_pendente">Retorno pendente</option><option value="inativo">Inativo</option></select></Field>
          <Field label="Profissional"><select className={inputClass()} value={filters.professionalId} onChange={(event) => setFilters({ ...filters, professionalId: event.target.value })}><option value="todos">Todos</option>{professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
        </div>
        <div className="flex items-end">
          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary bg-primary-soft px-4 text-sm font-medium text-primary-dark hover:bg-primary/20 transition">
            Importar CSV
            <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const lines = text.split(/\r?\n/).filter(line => line.trim());
              // Assumindo a ordem: Nome, CPF, WhatsApp, Data Nasc, Endereço, CEP, Email
              // Aceita , ou ; como separador
              const parsed = lines.slice(1).map(line => {
                const cols = line.split(/[;,]/).map(c => c.trim());
                return {
                  nome: cols[0] || "Sem Nome",
                  cpf: cols[1] || null,
                  whatsapp: cols[2] || "00000000000",
                  dataNascimento: cols[3] || null,
                  endereco: (cols[4] || "") + (cols[5] ? ` - CEP: ${cols[5]}` : ""),
                  email: cols[6] || null,
                  status: "ativo" as const,
                  valorTotalGasto: 0,
                  profissionalId: null,
                  observacoes: "Importado em massa"
                };
              });
              if (parsed.length > 0 && confirm(`Confirmar importação de ${parsed.length} pacientes?`)) {
                await onImportMassively(parsed);
              }
              e.target.value = '';
            }} />
          </label>
        </div>
      </div>
      <form ref={formRef} className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-8" onSubmit={(event) => { event.preventDefault(); void onSave(form); setForm({ ...form, id: "", nome: "", whatsapp: "", cpf: "", endereco: "" }); }}>
        <Field label="Nome"><input className={inputClass()} value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} required /></Field>
        <Field label="WhatsApp"><input className={inputClass()} value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} required /></Field>
        <Field label="CPF"><input className={inputClass()} value={form.cpf ?? ""} onChange={(event) => setForm({ ...form, cpf: event.target.value })} /></Field>
        <Field label="Nascimento"><input className={inputClass()} type="date" value={form.dataNascimento ?? ""} onChange={(event) => setForm({ ...form, dataNascimento: event.target.value })} /></Field>
        <Field label="E-mail"><input className={inputClass()} type="email" value={form.email ?? ""} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <Field label="Endereço"><input className={inputClass()} value={form.endereco ?? ""} onChange={(event) => setForm({ ...form, endereco: event.target.value })} /></Field>
        <Field label="Status"><select className={inputClass()} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Patient["status"] })}><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="retorno_pendente">Retorno pendente</option></select></Field>
        <Field label="Valor total"><input className={inputClass()} type="number" value={form.valorTotalGasto} onChange={(event) => setForm({ ...form, valorTotalGasto: Number(event.target.value) })} /></Field>
        <Field label="Observações"><input className={inputClass()} value={form.observacoes ?? ""} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} /></Field>
        <button className="mt-5 h-10 rounded bg-primary px-4 text-sm font-medium text-white" type="submit">Salvar</button>
      </form>
      {filteredPatients.length === 0 ? <EmptyState title="Nenhum paciente" message="Pacientes aparecem pelo admin ou pelo agendamento público." /> : <RefinedTable headers={["Nome", "CPF", "WhatsApp", "Endereço", "Status", "Observações", "Total gasto", ""]}>{filteredPatients.map((patient) => <tr className="border-b border-surface-variant hover:bg-teal-50" key={patient.id}><td className="px-4 py-3 font-medium">{patient.nome}</td><td className="px-4 py-3">{patient.cpf ?? "-"}</td><td className="px-4 py-3">{patient.whatsapp}</td><td className="px-4 py-3">{patient.endereco ?? "-"}</td><td className="px-4 py-3"><StatusPill value={patient.status} /></td><td className="px-4 py-3">{patient.observacoes ?? "-"}</td><td className="px-4 py-3 text-right">{brl.format(patient.valorTotalGasto)}</td><td className="px-4 py-3 text-right"><button className="mr-2 rounded border border-outline-variant px-2 py-1 text-xs" onClick={() => setSelectedPatient(patient)} type="button">Prontuário</button><button className="mr-2 rounded border border-outline-variant px-2 py-1 text-xs" onClick={() => { setForm(patient); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} type="button">Editar</button><button onClick={() => void onDelete(patient.id)} type="button"><Trash2 className="h-4 w-4" /></button></td></tr>)}</RefinedTable>}
    </SectionCard>
  );
}

function PatientKanbanPanel({ patients, appointments, professionals, onSave }: { readonly patients: Patient[]; readonly appointments: Appointment[]; readonly professionals: Professional[]; readonly onSave: (values: Patient) => Promise<void> }) {
  type KanbanStage = NonNullable<Patient["kanbanStage"]>;
  const [filters, setFilters] = useState({ search: "", professionalId: "todos" });
  const [draggedPatientId, setDraggedPatientId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<KanbanStage | null>(null);
  const today = todayISO();
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = `${patient.nome} ${patient.whatsapp} ${patient.email ?? ""}`.toLowerCase().includes(filters.search.toLowerCase());
    const matchesProfessional = filters.professionalId === "todos" || patient.profissionalId === filters.professionalId;
    return matchesSearch && matchesProfessional;
  });
  const columns: Array<{ id: KanbanStage; title: string; help: string; accent: string }> = [
    { id: "novo", title: "Novo lead", help: "Ainda sem consulta registrada.", accent: "border-t-sky-400" },
    { id: "agendado", title: "Agendado", help: "Consulta futura pendente ou confirmada.", accent: "border-t-indigo-400" },
    { id: "atendido", title: "Atendido", help: "Ja realizou consulta e pode virar retorno.", accent: "border-t-emerald-400" },
    { id: "retorno", title: "Retorno pendente", help: "Na janela de contato para voltar.", accent: "border-t-amber-400" },
    { id: "faltou", title: "Faltou", help: "Precisa de recuperacao ativa.", accent: "border-t-rose-400" },
    { id: "inativo", title: "Inativo", help: "Sem movimento recente.", accent: "border-t-slate-400" }
  ];

  function stageFor(patient: Patient): KanbanStage {
    if (patient.kanbanStage) return patient.kanbanStage;
    const patientAppointments = appointments.filter((appointment) => appointment.pacienteNome === patient.nome);
    if (patientAppointments.some((appointment) => appointment.status === "faltou")) return "faltou";
    if (patient.status === "inativo") return "inativo";
    if (patient.status === "retorno_pendente" || (patient.proximoRetorno && patient.proximoRetorno <= today)) return "retorno";
    if (patientAppointments.some((appointment) => appointment.data >= today && ["pendente", "confirmado"].includes(appointment.status))) return "agendado";
    if (patientAppointments.some((appointment) => ["concluido", "confirmado"].includes(appointment.status)) || patient.ultimoAtendimento) return "atendido";
    return "novo";
  }

  function nextAction(patient: Patient, stage: KanbanStage) {
    if (stage === "agendado") return "Confirmar presenca 24h antes da consulta.";
    if (stage === "faltou") return "Enviar mensagem de recuperacao e oferecer novo horario.";
    if (stage === "retorno") return `Entrar em contato para retorno${patient.proximoRetorno ? ` em ${patient.proximoRetorno}` : ""}.`;
    if (stage === "atendido") return "Definir data de retorno e registrar observacoes.";
    if (stage === "inativo") return "Campanha de reativacao por WhatsApp.";
    return "Completar cadastro e conduzir para agendamento.";
  }

  async function movePatient(patient: Patient, stage: KanbanStage) {
    const nextStatus: Patient["status"] = stage === "inativo" ? "inativo" : stage === "retorno" ? "retorno_pendente" : "ativo";
    await onSave({
      ...patient,
      status: nextStatus,
      kanbanStage: stage,
      proximoRetorno: stage === "retorno" ? patient.proximoRetorno ?? today : patient.proximoRetorno,
      ultimoAtendimento: stage === "atendido" ? patient.ultimoAtendimento ?? today : patient.ultimoAtendimento
    });
  }

  function handleDrop(stage: KanbanStage) {
    const patient = filteredPatients.find((item) => item.id === draggedPatientId);
    setDraggedPatientId(null);
    setDropTarget(null);
    if (!patient || stageFor(patient) === stage) return;
    void movePatient(patient, stage);
  }

  return (
    <SectionCard title="Kanban de Pacientes" description="Arraste pacientes entre etapas para atualizar o funil clinico e comercial.">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_260px]">
        <Field label="Buscar"><input className={inputClass()} placeholder="Nome, WhatsApp ou e-mail" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></Field>
        <Field label="Profissional"><select className={inputClass()} value={filters.professionalId} onChange={(event) => setFilters({ ...filters, professionalId: event.target.value })}><option value="todos">Todos</option>{professionals.map((item) => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></Field>
      </div>
      {/* Kanban horizontal com scroll */}
      <div className="-mx-1 overflow-x-auto pb-3">
        <div className="flex gap-3 px-1" style={{ minWidth: `${columns.length * 292}px` }}>
          {columns.map((column) => {
            const items = filteredPatients.filter((patient) => stageFor(patient) === column.id);
            return (
              <section
                className={`flex w-[280px] shrink-0 flex-col rounded-xl border border-t-4 bg-surface-container-low transition ${column.accent} ${dropTarget === column.id ? "border-primary bg-primary/5 shadow-modal" : "border-surface-variant"}`}
                onDragLeave={() => setDropTarget(null)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropTarget(column.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(column.id);
                }}
                key={column.id}
              >
                {/* Cabeçalho fixo da coluna */}
                <div className="border-b border-surface-variant px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-on-surface">{column.title}</h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-secondary border border-surface-variant">{items.length}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-secondary">{column.help}</p>
                </div>
                {/* Cards da coluna */}
                <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 520 }}>
                  {items.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-outline-variant bg-white/60">
                      <p className="text-[11px] font-medium text-secondary">Solte pacientes aqui</p>
                    </div>
                  ) : (
                    items.map((patient) => (
                      <article
                        className={`cursor-grab rounded-lg border border-outline-variant bg-white p-3 shadow-clinical transition active:cursor-grabbing ${draggedPatientId === patient.id ? "scale-[0.98] opacity-60 ring-2 ring-primary/25" : "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-modal"}`}
                        draggable
                        key={patient.id}
                        onDragEnd={() => {
                          setDraggedPatientId(null);
                          setDropTarget(null);
                        }}
                        onDragStart={(event) => {
                          setDraggedPatientId(patient.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", patient.id);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-on-surface">{patient.nome}</p>
                            <p className="mt-0.5 text-xs text-secondary">{patient.whatsapp}</p>
                          </div>
                          <span className="rounded-full border border-outline-variant px-2 py-0.5 text-[10px] font-semibold text-secondary">{brl.format(patient.valorTotalGasto)}</span>
                        </div>
                        <p className="mt-2 text-[11px] leading-snug text-on-surface-variant">{nextAction(patient, column.id)}</p>
                        <div className="mt-3 grid grid-cols-2 gap-1.5">
                          {column.id !== "retorno" ? <button className="rounded-md border border-outline-variant px-2 py-1 text-[11px] font-medium hover:border-primary hover:text-primary transition" onClick={() => void movePatient(patient, "retorno")} type="button">Retorno</button> : null}
                          {column.id !== "inativo" ? <button className="rounded-md border border-outline-variant px-2 py-1 text-[11px] font-medium hover:border-red-300 hover:text-error transition" onClick={() => void movePatient(patient, "inativo")} type="button">Inativar</button> : null}
                          {patient.status !== "ativo" ? <button className="col-span-2 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-white hover:bg-primary-dark transition" onClick={() => void movePatient(patient, "novo")} type="button">Reativar</button> : null}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

function FinancePanel({ entries, kpis, onPayment, onExpense, onUpdatePayment, onUpdateExpense, onDeletePayment, onDeleteExpense, professionals, clinicaNome, clinicaCnpj }: { readonly entries: FinanceEntry[]; readonly kpis: { revenue: number; expenses: number; profit: number; overdue: number; forecast: number }; readonly onPayment: (values: { valor: number; status: FinanceEntry["status"]; formaPagamento?: string }) => Promise<void>; readonly onExpense: (values: { descricao: string; categoria?: string; valor: number; status: FinanceEntry["status"] }) => Promise<void>; readonly onUpdatePayment: (id: string, values: { valor: number; status: FinanceEntry["status"]; formaPagamento?: string | null; data?: string | null }) => Promise<void>; readonly onUpdateExpense: (id: string, values: { descricao: string; categoria?: string | null; valor: number; status: FinanceEntry["status"]; data?: string | null }) => Promise<void>; readonly onDeletePayment: (id: string) => Promise<void>; readonly onDeleteExpense: (id: string) => Promise<void>; readonly professionals: Professional[]; readonly clinicaNome: string; readonly clinicaCnpj?: string }) {
  const [activeTab, setActiveTab] = useState<"lancamentos" | "exportar">("lancamentos");
  const [payment, setPayment] = useState({ id: "", descricao: "", valor: 180, status: "pago" as FinanceEntry["status"], formaPagamento: "manual", data: todayISO() });
  const [expense, setExpense] = useState({ id: "", descricao: "", valor: 90, categoria: "Operacional", status: "pendente" as FinanceEntry["status"], data: todayISO() });
  const [filters, setFilters] = useState({ search: "", status: "todos", tipo: "todos" });
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.descricao.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "todos" || entry.status === filters.status;
    const matchesType = filters.tipo === "todos" || (entry.tipo ?? "pagamento") === filters.tipo;
    return matchesSearch && matchesStatus && matchesType;
  });
  return (
    <div className="space-y-5">
      <div className="flex border-b border-surface-variant">
        <button
          className={`px-4 py-3 text-sm font-medium ${activeTab === "lancamentos" ? "border-b-2 border-primary text-primary" : "text-secondary hover:text-on-surface"}`}
          onClick={() => setActiveTab("lancamentos")}
        >
          Lançamentos
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium ${activeTab === "exportar" ? "border-b-2 border-primary text-primary" : "text-secondary hover:text-on-surface"}`}
          onClick={() => setActiveTab("exportar")}
        >
          Exportar
        </button>
      </div>

      {activeTab === "lancamentos" ? (
        <>
          <section className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Receita do Mês", value: kpis.revenue, highlight: false },
          { label: "Despesas", value: kpis.expenses, highlight: false },
          { label: "Lucro Estimado", value: kpis.profit, highlight: kpis.profit > 0 },
          { label: "Inadimplência", value: kpis.overdue, highlight: kpis.overdue > 0, danger: true },
          { label: "Previsto", value: kpis.forecast, highlight: false }
        ].map(({ label, value, highlight, danger }) => (
          <div className="rounded-xl border border-surface-variant bg-white p-4 transition hover:shadow-clinical" key={label}>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">{label}</p>
            <p className={`mt-2 text-xl font-bold ${
              danger && (value as number) > 0 ? "text-error" : highlight ? "text-primary" : "text-on-surface"
            }`}>{brl.format(value as number)}</p>
          </div>
        ))}
      </section>
      <SectionCard title="Financeiro">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Field label="Buscar"><input className={inputClass()} placeholder="Descrição" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></Field>
          <Field label="Status"><select className={inputClass()} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="todos">Todos</option><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option><option value="cancelado">Cancelado</option></select></Field>
          <Field label="Tipo"><select className={inputClass()} value={filters.tipo} onChange={(event) => setFilters({ ...filters, tipo: event.target.value })}><option value="todos">Todos</option><option value="pagamento">Pagamentos</option><option value="despesa">Despesas</option></select></Field>
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          <form className="rounded border border-surface-variant p-3" onSubmit={(event) => { event.preventDefault(); payment.id ? void onUpdatePayment(payment.id, payment) : void onPayment(payment); setPayment({ id: "", descricao: "", valor: 180, status: "pago", formaPagamento: "manual", data: todayISO() }); }}>
            <Field label="Descrição"><input className={inputClass()} placeholder="Ex: Receita extra" value={payment.descricao || ""} onChange={(event) => setPayment({ ...payment, descricao: event.target.value })} required /></Field>
            <Field label="Valor da Receita"><input className={inputClass()} type="number" value={payment.valor} onChange={(event) => setPayment({ ...payment, valor: Number(event.target.value) })} /></Field>
            <Field label="Status"><select className={inputClass()} value={payment.status} onChange={(event) => setPayment({ ...payment, status: event.target.value as FinanceEntry["status"] })}><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option><option value="cancelado">Cancelado</option></select></Field>
            <button className="mt-3 rounded bg-primary px-4 py-2 text-sm text-white">{payment.id ? "Atualizar pagamento" : "Criar pagamento"}</button>
          </form>
          <form className="rounded border border-surface-variant p-3" onSubmit={(event) => { event.preventDefault(); expense.id ? void onUpdateExpense(expense.id, expense) : void onExpense(expense); setExpense({ id: "", descricao: "", valor: 90, categoria: "Operacional", status: "pendente", data: todayISO() }); }}>
            <Field label="Despesa"><input className={inputClass()} value={expense.descricao} onChange={(event) => setExpense({ ...expense, descricao: event.target.value })} required /></Field>
            <Field label="Valor"><input className={inputClass()} type="number" value={expense.valor} onChange={(event) => setExpense({ ...expense, valor: Number(event.target.value) })} /></Field>
            <Field label="Status"><select className={inputClass()} value={expense.status} onChange={(event) => setExpense({ ...expense, status: event.target.value as FinanceEntry["status"] })}><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option><option value="cancelado">Cancelado</option></select></Field>
            <button className="mt-3 rounded bg-primary px-4 py-2 text-sm text-white">{expense.id ? "Atualizar despesa" : "Criar despesa"}</button>
          </form>
        </div>
        {filteredEntries.length === 0 ? <EmptyState title="Nenhum lançamento" message="Pagamentos e despesas cadastrados aparecerão aqui." /> : <RefinedTable headers={["Descrição", "Tipo", "Status", "Valor", "Ações"]}>{filteredEntries.map((entry) => <tr className="border-b border-surface-variant hover:bg-teal-50/60 transition" key={entry.id}><td className="px-4 py-3 font-medium">{entry.descricao}</td><td className="px-4 py-3 capitalize text-secondary">{entry.tipo === "despesa" ? "Despesa" : "Receita"}</td><td className="px-4 py-3"><StatusPill value={entry.status} /></td><td className="px-4 py-3 text-right font-semibold text-on-surface">{brl.format(entry.valor)}</td><td className="px-4 py-3 text-right"><button className="mr-2 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary transition" onClick={() => entry.tipo === "despesa" ? setExpense({ id: entry.id, descricao: entry.descricao, valor: entry.valor, categoria: entry.categoria ?? "", status: entry.status, data: entry.data ?? todayISO() }) : setPayment({ id: entry.id, descricao: entry.descricao, valor: entry.valor, status: entry.status, formaPagamento: entry.formaPagamento ?? "manual", data: entry.data ?? todayISO() })} type="button">Editar</button><button className="rounded-lg p-1.5 text-secondary hover:bg-red-50 hover:text-error transition" onClick={() => entry.tipo === "despesa" ? void onDeleteExpense(entry.id) : void onDeletePayment(entry.id)} type="button"><Trash2 className="h-4 w-4" /></button></td></tr>)}</RefinedTable>}
      </SectionCard>
        </>
      ) : (
        <ExportPage entries={entries} professionals={professionals} clinicaNome={clinicaNome} clinicaCnpj={clinicaCnpj} />
      )}
    </div>
  );
}

function PackagesPanel({ packages, patients, services, onSave, onRegister }: { readonly packages: any[]; readonly patients: Patient[]; readonly services: Service[]; readonly onSave: (values: { pacienteId?: string | null; servicoId?: string | null; totalSessoes: number }) => Promise<void>; readonly onRegister: (pkg: any) => Promise<void> }) {
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

function ReportsPanel({ appointments, patients, professionals, services, entries }: { readonly appointments: Appointment[]; readonly patients: Patient[]; readonly professionals: Professional[]; readonly services: Service[]; readonly entries: FinanceEntry[] }) {
  const paid = entries.filter((entry) => entry.tipo !== "despesa" && entry.status === "pago").reduce((sum, entry) => sum + entry.valor, 0);
  const missed = appointments.filter((item) => item.status === "faltou").length;
  const ticket = appointments.length ? paid / appointments.length : 0;
  const metrics = [
    ["Ocupação Média", `${Math.round((appointments.length / Math.max(professionals.length * 40, 1)) * 100)}%`],
    ["Faturamento", brl.format(paid)],
    ["Ticket Médio", brl.format(ticket)],
    ["Taxa de Faltas", `${Math.round((missed / Math.max(appointments.length, 1)) * 100)}%`],
    ["Pacientes Ativos", patients.filter((item) => item.status === "ativo").length],
    ["Serviços Cadastrados", services.length]
  ];
  return (
    <SectionCard title="Relatórios" description="KPIs calculados a partir de agendamentos, pagamentos, pacientes, profissionais e serviços.">
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div className="rounded-xl border border-surface-variant bg-white p-5 transition hover:shadow-clinical" key={label as string}>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">{label}</p>
            <p className="mt-2 text-2xl font-bold text-on-surface">{value}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function AIPanel({ insights, clinicName }: { readonly insights: ReturnType<typeof calculateGrowthInsights>; readonly clinicName: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState("Retenção");

  const handleSimulate = () => {
    setIsThinking(true);
    setTimeout(() => setIsThinking(false), 1500);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Coluna de Parâmetros (Esquerda) */}
      <div className="lg:col-span-4 space-y-5">
        <SectionCard title="Parâmetros de Crescimento" description="Defina seus objetivos para que a IA gere recomendações.">
          <div className="space-y-4">
            <Field label="Objetivo Principal">
              <select className={inputClass()} value={selectedGoal} onChange={(e) => setSelectedGoal(e.target.value)}>
                <option>Retenção de Pacientes</option>
                <option>Aumento de Ticket Médio</option>
                <option>Recuperação de Faltas</option>
                <option>Atração de Novos Leads</option>
              </select>
            </Field>
            <Field label="Público-alvo">
              <select className={inputClass()}>
                <option>Todos os Pacientes</option>
                <option>Pacientes Inativos (+6 meses)</option>
                <option>Pacientes com Retorno Pendente</option>
                <option>Leads de Redes Sociais</option>
              </select>
            </Field>
            <Field label="Orçamento Estimado">
              <input className={inputClass()} type="number" placeholder="R$ 0,00" />
            </Field>
            <button 
              onClick={handleSimulate}
              disabled={isThinking}
              className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {isThinking ? (
                <>
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  IA Analisando...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4" />
                  Gerar Plano de Ação
                </>
              )}
            </button>
          </div>
        </SectionCard>

        {/* Pro Tip Card */}
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-5 shadow-clinical">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Pro Tip</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant font-medium">
            Campanhas de retenção enviadas às terças-feiras costumam ter 40% mais cliques no WhatsApp do que em outros dias.
          </p>
        </div>
      </div>

      {/* Palco de Resultados (Direita) */}
      <div className="lg:col-span-8">
        <SectionCard title="Plano de Ação Inteligente" description="Insights calculados em tempo real com base nos dados operacionais da clínica.">
          {isThinking ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 text-secondary">
              <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-sm font-medium animate-pulse">Cruzando dados de agendamentos e finanças...</p>
            </div>
          ) : insights.length === 0 ? (
            <EmptyState title="Tudo em dia!" message="Sua clínica está operando com alta eficiência. Quando houver ociosidade ou inadimplência, as sugestões aparecerão aqui." />
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Métricas de Impacto */}
              <div className="grid gap-3 sm:grid-cols-3 mb-6">
                <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary">ROI Estimado</p>
                  <p className="mt-1 text-xl font-bold text-primary">12.5x</p>
                </div>
                <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Recuperação Prevista</p>
                  <p className="mt-1 text-xl font-bold text-on-surface">
                    {brl.format(insights.reduce((acc, curr) => acc + curr.value, 0))}
                  </p>
                </div>
                <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Ações Sugeridas</p>
                  <p className="mt-1 text-xl font-bold text-secondary">{insights.length}</p>
                </div>
              </div>

              {insights.map((insight) => {
                const message = buildWhatsAppMessage(insight, clinicName);
                return (
                  <article className="rounded-xl border border-surface-variant bg-white p-5 transition hover:shadow-clinical" key={insight.id}>
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <StatusPill value={insight.type} />
                          <span className="text-[10px] font-bold text-secondary uppercase tracking-tighter">Impacto {insight.value > 1000 ? "Alto" : "Médio"}</span>
                        </div>
                        <h3 className="mt-3 font-semibold text-on-surface">{insight.title}</h3>
                        <p className="mt-1 text-sm text-secondary">{insight.description}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <button
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium hover:border-primary hover:text-primary transition"
                          onClick={() => { void navigator.clipboard.writeText(message); setCopied(insight.id); }}
                          type="button"
                        >
                          {copied === insight.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {copied === insight.id ? "Copiado!" : "Copiar"}
                        </button>
                        {insight.whatsapp ? (
                          <a
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark transition"
                            href={whatsappUrl(insight.whatsapp, message)}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp
                          </a>
                        ) : null}
                      </div>
                    </div>
                    
                    {/* Mensagem sugerida formatada */}
                    <div className="mt-4 rounded-xl bg-surface-container-low p-4 text-sm leading-relaxed text-secondary border border-surface-variant/50 relative group">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-primary/60">Sugerido para WhatsApp</p>
                      <div className="italic text-on-surface-variant">"{message}"</div>
                      <div className="mt-3 flex items-center gap-2 text-[10px] text-secondary font-medium">
                        <Clock className="h-3 w-3" /> Sugestão de envio: Próxima terça-feira, 09:30
                      </div>
                    </div>
                  </article>
                );
              })}

              {/* Checklist de Implementação */}
              <div className="mt-8 rounded-xl border border-dashed border-outline-variant p-6 bg-white">
                <h4 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Checklist de Implementação
                </h4>
                <ul className="space-y-3">
                  {[
                    "Confirmar lista de pacientes com o profissional responsável.",
                    "Ajustar mensagens sugeridas para o tom de voz da clínica.",
                    "Disparar mensagens em blocos de 20 para evitar spam.",
                    "Registrar retornos agendados no painel de pacientes."
                  ].map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-secondary">
                      <div className="mt-1 h-4 w-4 shrink-0 rounded border border-outline-variant flex items-center justify-center text-[10px] font-bold text-primary">
                        {idx + 1}
                      </div>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function AccessPanel({ users, professionals, onCreate, onSave, onDelete }: {
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
                <button onClick={() => void onDelete(user.id)} type="button"><Trash2 className="h-4 w-4" /></button>
              </td>
            </tr>
          ))}
        </RefinedTable>
      )}
    </SectionCard>
  );
}

function RefinedTable({ headers, children }: { readonly headers: string[]; readonly children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full min-w-[760px] border-collapse bg-white text-left text-sm">
        <thead className="bg-surface-container-low">
          <tr>{headers.map((header) => <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant last:text-right" key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
