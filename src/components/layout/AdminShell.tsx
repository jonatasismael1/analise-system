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
  Stethoscope,
  Users,
  Menu,
  X,
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
}

export function AdminShell({ children, activeModule, modules, onModuleChange, onLogout, clinicaId, noPadding }: AdminShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink md:flex">
      <OfflineBanner />

      <div className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-[#192827] px-4 md:hidden">
        <div className="flex items-center gap-2">
          <button
            className="rounded-md p-1.5 text-white/60 transition hover:bg-white/[0.08] hover:text-white/90"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            type="button"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <img src="/logo-analise.png" alt="Análise Saúde" className="ml-1 h-7 w-auto" />
        </div>
        <div className="flex items-center">
          {clinicaId && <NotificationBell clinicaId={clinicaId} />}
        </div>
      </div>

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col bg-[#192827] shadow-[2px_0_12px_rgba(0,0,0,0.18)] transition-transform duration-300 md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center gap-3 px-5">
          <img src="/logo-analise.png" alt="Análise Saúde System" className="h-8 w-auto" />
          <div className="leading-none">
            <p className="text-[13px] font-semibold text-[#E4F5F3]">Análise Saúde</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-white/40">System</p>
          </div>
        </div>

        <div className="mx-4 h-px bg-white/[0.06]" />

        <nav className="flex-1 overflow-y-auto py-3">
          {modules.map((item) => {
            const Icon = iconByModule[item] ?? LayoutDashboard;
            const active = item === activeModule;
            return (
              <button
                className={`flex w-full items-center gap-2.5 py-2.5 pl-5 pr-4 text-left text-[13px] transition-all duration-150 min-h-[44px] md:min-h-0 ${
                  active
                    ? "border-l-[3px] border-[#1DC9B5] bg-[rgba(29,201,181,0.13)] pl-[17px] font-semibold text-white"
                    : "border-l-[3px] border-transparent font-medium text-white/65 hover:bg-white/[0.08] hover:text-white/95"
                }`}
                key={item}
                onClick={() => {
                  onModuleChange(item);
                  setIsMobileMenuOpen(false);
                }}
                type="button"
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-[#1DC9B5]" : "text-white/40"}`}
                />
                <span className="truncate">{item}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <button
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] font-medium text-white/50 transition duration-150 hover:bg-red-900/40 hover:text-red-300 min-h-[44px] md:min-h-0"
            onClick={() => void onLogout()}
            type="button"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sair da conta
          </button>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-[rgba(25,40,39,0.6)] backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main className="w-full min-h-[100dvh] pt-14 md:pl-[240px] md:pt-0">
        {noPadding ? (
          <div className="h-[calc(100dvh-3.5rem)] overflow-hidden md:h-[100dvh]">{children}</div>
        ) : (
          <div className="mx-auto w-full max-w-[1300px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="min-w-0">{children}</div>
          </div>
        )}
      </main>
    </div>
  );
}
