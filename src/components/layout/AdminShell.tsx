import {
  Activity,
  BarChart3,
  Bot,
  CalendarDays,
  CreditCard,
  KeyRound,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  Stethoscope,
  Users,
  Menu,
  X
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { OfflineBanner } from "../OfflineBanner";
import { NotificationBell } from "../NotificationBell";

const iconByModule: Record<string, React.ComponentType<{ className?: string }>> = {
  Dashboard: LayoutDashboard,
  Profissionais: Stethoscope,
  "Serviços": Activity,
  Agendamentos: CalendarDays,
  Pacientes: Users,
  "Kanban Pacientes": KanbanSquare,
  Financeiro: CreditCard,
  "Pacotes & Sessões": PackageCheck,
  "Relatórios": BarChart3,
  "AI Growth Engine": Bot,
  Acessos: KeyRound
};

export interface AdminShellProps {
  readonly children: ReactNode;
  readonly activeModule: string;
  readonly modules: string[];
  readonly onModuleChange: (module: any) => void;
  readonly onLogout: () => void | Promise<void>;
  readonly clinicaId?: string;
}

export function AdminShell({ children, activeModule, modules, onModuleChange, onLogout, clinicaId }: AdminShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-surface md:flex pt-14 md:pt-0">
      <OfflineBanner />
      
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-surface-variant bg-white px-4 md:hidden mt-[var(--banner-offset,0px)]">
        <div className="flex items-center gap-2">
          <button className="p-2 -ml-2 text-secondary" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <span className="font-bold text-primary ml-1">Clinic Pro</span>
        </div>
        <div className="flex items-center">
          {clinicaId && <NotificationBell clinicaId={clinicaId} />}
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-surface-variant bg-white transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="hidden md:flex items-center gap-3 px-5 py-5">
          <img src="/logo-clinic-pro.png" alt="Clinic Pro" className="h-10 w-auto" />
          <div>
            <p className="text-lg font-black leading-tight tracking-tight text-primary">Clinic Pro</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Administração Clínica</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 md:py-1 space-y-0.5 mt-14 md:mt-0">
          {modules.map((item) => {
            const Icon = iconByModule[item] ?? LayoutDashboard;
            const active = item === activeModule;
            return (
              <button
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 min-h-[48px] md:min-h-0 ${
                  active
                    ? "bg-teal-50 text-primary"
                    : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                }`}
                key={item}
                onClick={() => {
                  onModuleChange(item);
                  setIsMobileMenuOpen(false);
                }}
                type="button"
              >
                <Icon className={`h-5 w-5 md:h-4 md:w-4 shrink-0 ${active ? "text-primary" : "text-slate-400"}`} />
                <span className="truncate">{item}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-surface-variant p-3">
          <button
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 min-h-[48px] md:min-h-0"
            onClick={() => void onLogout()}
            type="button"
          >
            <LogOut className="h-5 w-5 md:h-4 md:w-4 shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Main content */}
      <main className="w-full md:pl-[260px] pt-14 md:pt-0">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
