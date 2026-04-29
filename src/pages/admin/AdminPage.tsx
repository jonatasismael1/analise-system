import { useEffect, useMemo, useState } from "react";
import { LogOut, RefreshCcw } from "lucide-react";
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
import { PatientKanbanPanel } from "./modules/PatientKanbanPanel";
import { FinancePanel } from "./modules/FinancePanel";
import { PackagesPanel } from "./modules/PackagesPanel";
import { ReportsPanel } from "./modules/ReportsPanel";
import { AIPanel } from "./modules/AIPanel";
import { AccessPanel } from "./modules/AccessPanel";

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

export function AdminPage() {
  const { clinic, logout, loading, role, profile } = useAuth();
  const [activeModule, setActiveModule] = useState<Module>("Dashboard");
  const data = useClinicData(clinic?.id, role, profile?.profissionalId);
  const visibleModules = useMemo(() => modules.filter((module) => {
    if (role === "admin") return true;
    if (role === "secretaria") return !["Financeiro", "AI Growth Engine", "Acessos"].includes(module);
    return ["Dashboard", "Agendamentos", "Pacientes", "Kanban Pacientes"].includes(module);
  }), [role]);

  const growthAnalysis = useMemo(() => calculateGrowthInsights({
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
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-surface-variant bg-white/95 p-5 shadow-clinical md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-primary">Clinic Pro</p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight text-on-surface md:text-[36px]">{activeModule}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-secondary">
            <span>{clinic?.nome ?? "Clínica"} · Administração precisa · Perfil: {role}</span>
            {isDemoMode ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">Modo demonstração</span> : null}
          </div>
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
        <DataMessage loading={data.loading} message={data.message} onRetry={() => void data.reload()} />
        {activeModule === "Dashboard" ? <DashboardPanel appointments={data.appointments} professionals={data.professionals} patients={data.patients} kpis={data.financialKpis} insightsCount={growthAnalysis.insights.length} /> : null}
        {activeModule === "Profissionais" ? <ProfessionalsPanel professionals={data.professionals} onSave={data.saveProfessional} onDelete={data.deleteProfessional} onCreateAccess={data.createStaffUser} /> : null}
        {activeModule === "Serviços" ? <ServicesPanel services={data.services} professionals={data.professionals} onSave={data.saveService} onDelete={data.deleteService} /> : null}
        {activeModule === "Agendamentos" ? <AppointmentsPanel appointments={data.appointments} patients={data.patients} professionals={data.professionals} services={data.services} onSave={data.saveAppointment} onDelete={data.deleteAppointment} /> : null}
        {activeModule === "Pacientes" ? <PatientsPanel patients={data.patients} professionals={data.professionals} onSave={data.savePatient} onDelete={data.deletePatient} onImportMassively={data.importPatientsMassively} /> : null}
        {activeModule === "Kanban Pacientes" ? <PatientKanbanPanel patients={data.patients} appointments={data.appointments} professionals={data.professionals} onSave={data.savePatient} /> : null}
        {activeModule === "Financeiro" ? <FinancePanel entries={data.financeEntries} kpis={data.financialKpis} onPayment={data.savePayment} onExpense={data.saveExpense} onUpdatePayment={data.updatePayment} onUpdateExpense={data.updateExpense} onDeletePayment={data.deletePayment} onDeleteExpense={data.deleteExpense} professionals={data.professionals} services={data.services} clinicaNome={clinic?.nome ?? "Clinic Pro"} /> : null}
        {activeModule === "Pacotes & Sessões" ? <PackagesPanel packages={data.packages} patients={data.patients} services={data.services} onSave={data.savePackage} onRegister={data.registerSession} /> : null}
        {activeModule === "Relatórios" ? <ReportsPanel appointments={data.appointments} patients={data.patients} professionals={data.professionals} services={data.services} entries={data.financeEntries} /> : null}
        {activeModule === "AI Growth Engine" ? <AIPanel analysis={growthAnalysis} clinicName={clinic?.nome ?? "Clinic Pro"} /> : null}
        {activeModule === "Acessos" ? <AccessPanel users={data.users} professionals={data.professionals} onCreate={data.createStaffUser} onSave={data.saveUser} onDelete={data.deleteUser} /> : null}
      </div>
    </AdminShell>
  );
}
