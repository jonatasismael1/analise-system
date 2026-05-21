import { useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { Navigate } from "react-router-dom";
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
import { PackagesPanel } from "./modules/PackagesPanel";
import { ReportsPanel } from "./modules/ReportsPanel";
import { AccessPanel } from "./modules/AccessPanel";

const modules = [
  "Dashboard",
  "Profissionais",
  "Serviços",
  "Agendamentos",
  "Pacientes",
  "Leads",
  "WhatsApp",
  "Deby AI",
  "Kanban Pacientes",
  "Caixa",
  "Financeiro",
  "Pacotes & Sessões",
  "Relatórios",
  "Acessos"
] as const;

type Module = (typeof modules)[number];

export function AdminPage() {
  const { clinic, logout, loading, role, profile } = useAuth();
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
    if (role === "secretaria") return ["Dashboard", "Agendamentos", "Pacientes", "Leads", "WhatsApp", "Deby AI", "Kanban Pacientes", "Caixa", "Serviços", "Pacotes & Sessões"].includes(module);
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
    return <Navigate to="/login" replace />;
  }

  if (!role) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-6">
        <div className="max-w-md rounded-lg border border-danger/20 bg-surface p-6 text-center shadow-card">
          <h1 className="text-lg font-bold text-ink">Acesso não autorizado</h1>
          <p className="mt-2 text-sm text-ink-secondary">Seu usuário não tem um perfil ativo nesta clínica. Entre em contato com o administrador.</p>
          <button className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white" onClick={() => void logout()} type="button">
            Voltar para login
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminShell activeModule={activeModule} onModuleChange={changeModule} modules={[...visibleModules]} onLogout={logout} clinicaId={clinic.id} noPadding={activeModule === "WhatsApp"}>
      {activeModule !== "WhatsApp" && (
        <div className="mb-6 overflow-hidden rounded-lg border border-[rgba(21,168,152,0.12)] bg-surface shadow-card">
          <div className="h-[3px] w-full bg-primary" />
          <div className="flex flex-col justify-between gap-4 px-5 py-4 md:flex-row md:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Análise Saúde System</p>
              <h1 className="mt-0.5 text-[22px] font-bold leading-tight tracking-tight text-ink">{activeModule}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-secondary">
                <span>{clinic.nome ?? "Análise Saúde"}</span>
                <span className="text-ink-muted">·</span>
                <span className="capitalize">{role}</span>
                {isDemoMode ? (
                  <span className="rounded-full border border-warning/30 bg-warning-wash px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning">
                    Demo
                  </span>
                ) : null}
              </div>
            </div>
            <button
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-[12.5px] font-medium text-ink-secondary transition hover:bg-surface-low active:-translate-y-px"
              onClick={() => void data.reload()}
              type="button"
            >
              <RefreshCcw className="h-3 w-3" />
              Atualizar
            </button>
          </div>
        </div>
      )}

      {activeModule === "WhatsApp" ? <WhatsAppPanel clinicId={clinic.id} onNavigateToAppointments={() => changeModule("Agendamentos")} /> : (
        <div className="space-y-5">
          <DataMessage loading={data.loading} message={data.message} onRetry={() => void data.reload()} />
          {activeModule === "Dashboard" ? <DashboardPanel appointments={data.appointments} professionals={data.professionals} patients={data.patients} financeEntries={data.financeEntries} kpis={data.financialKpis} insightsCount={growthAnalysis.insights.length} role={role} /> : null}
          {activeModule === "Profissionais" ? <ProfessionalsPanel professionals={data.professionals} onSave={data.saveProfessional} onDelete={data.deleteProfessional} onCreateAccess={data.createStaffUser} /> : null}
          {activeModule === "Serviços" ? <ServicesPanel services={data.services} professionals={data.professionals} onSave={data.saveService} onDelete={data.deleteService} canManage={role === "admin"} /> : null}
          {activeModule === "Agendamentos" ? <AppointmentsPanel appointments={data.appointments} patients={data.patients} professionals={data.professionals} services={data.services} onSave={data.saveAppointment} onDelete={data.deleteAppointment} /> : null}
          {activeModule === "Pacientes" ? <PatientsPanel clinicId={clinic.id} patients={data.patients} professionals={data.professionals} onSave={data.savePatient} onDelete={data.deletePatient} onImportMassively={data.importPatientsMassively} role={role} /> : null}
          {activeModule === "Leads" ? <LeadKanbanPanel clinicId={clinic.id} /> : null}
          {activeModule === "Deby AI" && role ? <AIPanel clinicId={clinic.id} clinicName={clinic.nome ?? "Análise Saúde"} role={role} profileProfessionalId={profile?.profissionalId} appointments={data.appointments} patients={data.patients} professionals={data.professionals} services={data.services} financeEntries={data.financeEntries} growthAnalysis={growthAnalysis} /> : null}
          {activeModule === "Kanban Pacientes" ? <PatientKanbanPanel patients={data.patients} appointments={data.appointments} professionals={data.professionals} onSave={data.savePatient} /> : null}
          {activeModule === "Caixa" ? <CashPanel clinicId={clinic.id} role={role} /> : null}
          {activeModule === "Financeiro" ? <FinancePanel entries={data.financeEntries} kpis={data.financialKpis} onPayment={data.savePayment} onExpense={data.saveExpense} onUpdatePayment={data.updatePayment} onUpdateExpense={data.updateExpense} onDeletePayment={data.deletePayment} onDeleteExpense={data.deleteExpense} professionals={data.professionals} services={data.services} clinicaNome={clinic.nome ?? "Análise Saúde"} clinicId={clinic.id} /> : null}
          {activeModule === "Pacotes & Sessões" ? <PackagesPanel packages={data.packages} patients={data.patients} services={data.services} onSave={data.savePackage} onRegister={data.registerSession} /> : null}
          {activeModule === "Relatórios" ? <ReportsPanel appointments={data.appointments} patients={data.patients} professionals={data.professionals} services={data.services} entries={data.financeEntries} /> : null}
          {activeModule === "Acessos" ? <AccessPanel users={data.users} professionals={data.professionals} onCreate={data.createStaffUser} onSave={data.saveUser} onDelete={data.deleteUser} /> : null}
        </div>
      )}
    </AdminShell>
  );
}
