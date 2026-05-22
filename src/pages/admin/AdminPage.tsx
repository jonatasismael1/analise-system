import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, RefreshCcw } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { AdminShell } from "../../components/layout/AdminShell";
import { useAuth } from "../../contexts/AuthContext";
import { useClinicData } from "../../hooks/useClinicData";
import { calculateGrowthInsights } from "../../lib/aiGrowth";
import { isDemoMode } from "../../lib/appConfig";
import { DataMessage } from "./components/DataMessage";
import { DashboardPanel } from "./modules/DashboardPanel";
import { ProfessionalsPanel } from "./modules/ProfessionalsPanel";
import { ServicesPanel } from "./modules/ServicesPanel";
import { AppointmentsPanel } from "./modules/AppointmentsPanel";
import { PatientsPanel } from "./modules/PatientsPanel";
import { LeadKanbanPanel } from "./modules/LeadKanbanPanel";
import { WhatsAppPanel } from "./modules/WhatsAppPanel";
import { AIPanel } from "./modules/AIPanel";
import { PatientKanbanPanel } from "./modules/PatientKanbanPanel";
import { CashPanel } from "./modules/CashPanel";
import { FinancePanel } from "./modules/FinancePanel";
import { DiscountProgramsPanel } from "./modules/DiscountProgramsPanel";
import { OrcamentosPanel } from "./modules/OrcamentosPanel";
import { ReportsPanel } from "./modules/ReportsPanel";
import { AccessPanel } from "./modules/AccessPanel";

const modules = [
  "Dashboard",
  "Agendamentos",
  "Pacientes",
  "Leads",
  "WhatsApp",
  "Deby AI",
  "Kanban Pacientes",
  "Orçamentos",
  "Caixa",
  "Financeiro",
  "Serviços",
  "Programas de Descontos",
  "Relatórios",
  "Profissionais",
  "Acessos"
] as const;

type Module = (typeof modules)[number];

export function AdminPage() {
  const { clinic, logout, loading, role, profile, isSuperAdmin, setSuperAdminClinic } = useAuth();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<Module>(
    () => (sessionStorage.getItem("clinicpro_module") as Module | null) ?? "Dashboard"
  );

  const changeModule = (module: Module) => {
    sessionStorage.setItem("clinicpro_module", module);
    setActiveModule(module);
  };

  const data = useClinicData(clinic?.id, role, profile?.profissionalId);
  const visibleModules = useMemo(() => modules.filter((module) => {
    if (!role) return false;
    if (role === "admin") return true;
    if (role === "secretaria") return ["Dashboard", "Agendamentos", "Pacientes", "Leads", "WhatsApp", "Deby AI", "Kanban Pacientes", "Orçamentos", "Caixa", "Serviços", "Programas de Descontos", "Relatórios"].includes(module);
    return ["Dashboard", "Agendamentos", "Pacientes", "Deby AI", "Kanban Pacientes"].includes(module);
  }), [role]);

  const growthAnalysis = useMemo(() => calculateGrowthInsights({
    professionals: data.professionals,
    appointments: data.appointments,
    patients: data.patients,
    financeEntries: data.financeEntries,
    services: data.services
  }), [data.appointments, data.financeEntries, data.patients, data.professionals, data.services]);

  useEffect(() => {
    if (visibleModules.length && !visibleModules.includes(activeModule)) {
      changeModule(visibleModules[0]);
    }
  }, [activeModule, visibleModules]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
          <p className="text-[13px] font-medium text-ink-secondary">Carregando painel...</p>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return <Navigate to={isSuperAdmin ? "/gestor" : "/login"} replace />;
  }

  if (!role) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-6">
        <div className="max-w-md rounded-3xl border border-danger/20 bg-surface p-6 text-center shadow-card">
          <h1 className="text-lg font-bold text-ink">Acesso não autorizado</h1>
          <p className="mt-2 text-sm text-ink-secondary">Seu usuário não tem um perfil ativo nesta clínica. Entre em contato com o administrador.</p>
          <button className="mt-4 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark" onClick={() => void logout()} type="button">
            Voltar para login
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      activeModule={activeModule}
      onModuleChange={changeModule}
      modules={[...visibleModules]}
      onLogout={logout}
      clinicaId={clinic.id}
      noPadding={activeModule === "WhatsApp"}
      clinicName={clinic.nome ?? "Clínica Médica"}
      clinicLogoUrl={clinic.logo_url ?? null}
      userRole={role ?? undefined}
      profissionalId={profile?.profissionalId ?? null}
    >
      {activeModule !== "WhatsApp" && (
        <div className="mb-6 rounded-3xl border border-border bg-surface p-5 shadow-card md:p-6">
          {isSuperAdmin && (
            <button
              className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-ink-secondary transition hover:text-primary"
              onClick={() => {
                setSuperAdminClinic(null);
                navigate("/gestor");
              }}
              type="button"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Voltar ao painel do gestor
            </button>
          )}
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {isSuperAdmin ? "Gestor Geral · Visualizando" : "Deby Saúde"}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{activeModule}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-secondary">
                <span>{clinic.nome ?? "Clínica Médica"}</span>
                <span className="text-ink-muted">·</span>
                <span className="capitalize">{isSuperAdmin ? "Gestor Geral" : role}</span>
                {isDemoMode ? (
                  <span className="rounded-full border border-warning/30 bg-warning-wash px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning">
                    Demo
                  </span>
                ) : null}
                {isSuperAdmin ? (
                  <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    Super Admin
                  </span>
                ) : null}
              </div>
            </div>
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-2xl border border-border-strong bg-surface px-4 text-sm font-medium text-ink-secondary transition hover:bg-surface-low active:-translate-y-px"
              onClick={() => void data.reload()}
              type="button"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Atualizar
            </button>
          </div>
        </div>
      )}

      {activeModule === "WhatsApp" ? <WhatsAppPanel clinicId={clinic.id} onNavigateToAppointments={() => changeModule("Agendamentos")} /> : (
        <div className="space-y-5">
          <DataMessage loading={data.loading} message={data.message} onRetry={() => void data.reload()} />
          {activeModule === "Dashboard" ? <DashboardPanel appointments={data.appointments} professionals={data.professionals} patients={data.patients} financeEntries={data.financeEntries} users={data.users} kpis={data.financialKpis} insightsCount={growthAnalysis.insights.length} role={role} /> : null}
          {activeModule === "Profissionais" ? <ProfessionalsPanel professionals={data.professionals} onSave={data.saveProfessional} onDelete={data.deleteProfessional} onCreateAccess={data.createStaffUser} /> : null}
          {activeModule === "Serviços" ? <ServicesPanel services={data.services} professionals={data.professionals} onSave={data.saveService} onDelete={data.deleteService} canManage={role === "admin"} /> : null}
          {activeModule === "Agendamentos" ? <AppointmentsPanel appointments={data.appointments} patients={data.patients} professionals={data.professionals} services={data.services} memberships={data.memberships} programas={data.programas} onSave={data.saveAppointment} onDelete={data.deleteAppointment} onDeleteSeries={data.deleteAppointmentSeries} /> : null}
          {activeModule === "Pacientes" ? <PatientsPanel clinicId={clinic.id} patients={data.patients} professionals={data.professionals} programas={data.programas} memberships={data.memberships} onSave={data.savePatient} onDelete={data.deletePatient} onImportMassively={data.importPatientsMassively} onAnonymize={data.anonymizePatient} role={role} /> : null}
          {activeModule === "Leads" ? <LeadKanbanPanel clinicId={clinic.id} onConvertToPatient={data.savePatient} /> : null}
          {activeModule === "Deby AI" && role ? <AIPanel clinicId={clinic.id} clinicName={clinic.nome ?? "Clínica Médica"} role={role} profileProfessionalId={profile?.profissionalId} appointments={data.appointments} patients={data.patients} professionals={data.professionals} services={data.services} financeEntries={data.financeEntries} growthAnalysis={growthAnalysis} /> : null}
          {activeModule === "Kanban Pacientes" ? <PatientKanbanPanel patients={data.patients} appointments={data.appointments} professionals={data.professionals} onSave={data.savePatient} /> : null}
          {activeModule === "Caixa" ? <CashPanel clinicId={clinic.id} role={role} /> : null}
          {activeModule === "Financeiro" ? <FinancePanel entries={data.financeEntries} kpis={data.financialKpis} onPayment={data.savePayment} onExpense={data.saveExpense} onUpdatePayment={data.updatePayment} onUpdateExpense={data.updateExpense} onDeletePayment={data.deletePayment} onDeleteExpense={data.deleteExpense} professionals={data.professionals} services={data.services} clinicaNome={clinic.nome ?? "Clínica Médica"} clinicId={clinic.id} financeMonths={data.financeMonths} onChangeFinanceMonths={data.setFinanceMonths} memberships={data.memberships} patients={data.patients} programas={data.programas} /> : null}
          {activeModule === "Programas de Descontos" ? <DiscountProgramsPanel programas={data.programas} services={data.services} onSave={data.savePrograma} onDelete={data.deletePrograma} /> : null}
          {activeModule === "Orçamentos" ? <OrcamentosPanel orcamentos={data.orcamentos} services={data.services} programas={data.programas} clinicaNome={clinic.nome ?? "Clínica Médica"} clinicaUrl={window.location.origin} onSave={data.saveOrcamento} onDelete={data.deleteOrcamento} /> : null}
          {activeModule === "Relatórios" ? <ReportsPanel appointments={data.appointments} patients={data.patients} professionals={data.professionals} services={data.services} entries={data.financeEntries} clinicaNome={clinic.nome ?? "Clínica Médica"} /> : null}
          {activeModule === "Acessos" ? <AccessPanel users={data.users} professionals={data.professionals} onCreate={data.createStaffUser} onSave={data.saveUser} onDelete={data.deleteUser} /> : null}
        </div>
      )}
    </AdminShell>
  );
}
