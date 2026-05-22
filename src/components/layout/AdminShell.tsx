import {
  Activity,
  BarChart3,
  Bot,
  CalendarDays,
  CreditCard,
  FileText,
  HandCoins,
  KeyRound,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Percent,
  PanelLeft,
  PanelLeftClose,
  Search,
  Stethoscope,
  Users,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { OfflineBanner } from "../OfflineBanner";
import { NotificationBell } from "../NotificationBell";
import { ProfilePanel } from "./ProfilePanel";

const iconByModule: Record<string, React.ComponentType<{ className?: string }>> = {
  Dashboard: LayoutDashboard,
  Profissionais: Stethoscope,
  "Serviços": Activity,
  Agendamentos: CalendarDays,
  Pacientes: Users,
  Leads: KanbanSquare,
  WhatsApp: MessageCircle,
  "Deby AI": Bot,
  "Kanban Pacientes": KanbanSquare,
  Orçamentos: FileText,
  Caixa: HandCoins,
  Financeiro: CreditCard,
  "Programas de Descontos": Percent,
  Relatórios: BarChart3,
  Acessos: KeyRound,
};

export interface AdminShellProps {
  readonly children: ReactNode;
  readonly activeModule: string;
  readonly modules: string[];
  readonly onModuleChange: (module: any) => void;
  readonly onLogout: () => void | Promise<void>;
  readonly clinicaId?: string;
  readonly noPadding?: boolean;
  readonly clinicName?: string;
  readonly userRole?: string;
}

export function AdminShell({
  children,
  activeModule,
  modules,
  onModuleChange,
  onLogout,
  clinicaId,
  noPadding,
  clinicName,
  userRole,
}: AdminShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [localClinicName, setLocalClinicName] = useState(clinicName ?? "");

  // Sidebar aparece expandida se: não recolhida OU se recolhida mas com hover
  const sidebarExpanded = !isCollapsed || isHovering;

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink md:flex">
      <OfflineBanner />

      {/* ── Barra superior mobile ─────────────────────────── */}
      <div className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2">
          <button
            className="rounded-xl p-1.5 text-ink-muted transition hover:bg-surface-low hover:text-ink"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            type="button"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <img src="/logo-deby-saude.png" alt="Deby Saúde" className="ml-1 h-7 w-auto" />
        </div>
        <div className="flex items-center gap-2">
          {clinicaId && <NotificationBell clinicaId={clinicaId} />}
        </div>
      </div>

      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-white transition-all duration-250 ease-in-out md:translate-x-0 ${
          sidebarExpanded ? "md:w-72" : "md:w-[72px]"
        } w-72 ${isMobileMenuOpen ? "translate-x-0 shadow-xl" : "-translate-x-full md:translate-x-0"}`}
        onMouseEnter={() => isCollapsed && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Cabeçalho da sidebar */}
        <div
          className={`flex h-14 shrink-0 items-center border-b border-border-divider ${
            sidebarExpanded ? "gap-3 px-4" : "justify-center px-3"
          }`}
        >
          <img
            src="/icone-saude.png"
            alt="Deby Saúde"
            className="h-7 w-7 shrink-0 rounded-lg object-cover"
          />
          {sidebarExpanded && (
            <div className="min-w-0 flex-1 leading-none overflow-hidden">
              <p className="truncate text-[13px] font-semibold text-ink">Deby Saúde</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-ink-muted">
                Sistema Clínico
              </p>
            </div>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto py-2">
          {modules.map((item) => {
            const Icon = iconByModule[item] ?? LayoutDashboard;
            const active = item === activeModule;
            return (
              <div key={item} className="px-2 py-0.5">
                <button
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition-all duration-150 min-h-[44px] md:min-h-0 ${
                    !sidebarExpanded ? "justify-center" : ""
                  } ${
                    active
                      ? "border border-blue-100 bg-blue-50 font-semibold text-blue-600"
                      : "border border-transparent font-medium text-ink-secondary hover:bg-surface-low hover:text-ink"
                  }`}
                  onClick={() => {
                    onModuleChange(item);
                    setIsMobileMenuOpen(false);
                  }}
                  title={!sidebarExpanded ? item : undefined}
                  type="button"
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${active ? "text-blue-600" : "text-ink-muted"}`}
                  />
                  {sidebarExpanded && <span className="truncate">{item}</span>}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Rodapé da sidebar */}
        <div className="border-t border-border-divider p-2">
          <button
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-ink-muted transition duration-150 hover:bg-red-50 hover:text-red-600 min-h-[44px] md:min-h-0 ${
              !sidebarExpanded ? "justify-center" : ""
            }`}
            onClick={() => void onLogout()}
            title={!sidebarExpanded ? "Sair da conta" : undefined}
            type="button"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarExpanded && <span>Sair da conta</span>}
          </button>
        </div>
      </aside>

      {/* ── Botão toggle collapse (desktop) ───────────────── */}
      <button
        className={`fixed z-50 hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white shadow-sm text-ink-muted hover:text-ink transition-all duration-250 top-[30px] ${
          sidebarExpanded ? "left-[260px]" : "left-[60px]"
        }`}
        onClick={() => {
          setIsCollapsed(!isCollapsed);
          setIsHovering(false);
        }}
        title={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
        type="button"
      >
        {isCollapsed ? (
          <PanelLeft className="h-3 w-3" />
        ) : (
          <PanelLeftClose className="h-3 w-3" />
        )}
      </button>

      {/* ── Overlay mobile ────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Área principal ────────────────────────────────── */}
      <main
        className={`w-full min-h-[100dvh] pt-14 transition-all duration-250 ease-in-out md:pt-0 ${
          isCollapsed ? "md:pl-[72px]" : "md:pl-72"
        }`}
      >
        {/* Header sticky desktop */}
        <div className="sticky top-0 z-20 hidden md:flex h-14 items-center justify-between border-b border-border bg-white/70 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                className="h-9 w-72 rounded-2xl border border-transparent bg-surface-low pl-9 pr-4 text-sm text-ink placeholder-ink-muted transition focus:border-blue-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                placeholder="Buscar paciente, agendamento..."
                type="search"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {localClinicName && (
              <div className="text-right">
                <p className="text-[13px] font-medium text-ink">{localClinicName}</p>
                {userRole && (
                  <p className="text-[11px] capitalize text-ink-muted">{userRole}</p>
                )}
              </div>
            )}
            {clinicaId && <NotificationBell clinicaId={clinicaId} />}
            {clinicaId ? (
              <ProfilePanel
                clinicaId={clinicaId}
                clinicName={localClinicName || "Clínica"}
                userRole={userRole}
                onLogout={onLogout}
                onClinicNameChange={setLocalClinicName}
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white shadow-sm">
                {(localClinicName || "D").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo da página */}
        {noPadding ? (
          <div className="h-[calc(100dvh-3.5rem)] overflow-hidden">
            {children}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[1300px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="min-w-0">{children}</div>
          </div>
        )}
      </main>
    </div>
  );
}
