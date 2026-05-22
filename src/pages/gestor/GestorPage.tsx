import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Building2, Users, Calendar, Stethoscope, ArrowRight, LogOut, RefreshCcw, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import type { Database } from "../../types/database";

type Clinic = Database["public"]["Tables"]["clinicas"]["Row"];

interface ClinicSummary {
  id: string;
  nome: string;
  slug: string;
  email: string;
  logo_url: string | null;
  created_at: string;
  total_pacientes: number;
  total_agendamentos_mes: number;
  total_profissionais: number;
}

export function GestorPage() {
  const { isSuperAdmin, setSuperAdminClinic, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<ClinicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!authLoading && !isSuperAdmin) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    void loadClinics();
  }, []);

  async function loadClinics() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_all_clinics_summary");
      if (rpcError) throw rpcError;
      setClinics((data as ClinicSummary[]) ?? []);
    } catch (err: any) {
      setError(err.message ?? "Erro ao carregar clínicas.");
    } finally {
      setLoading(false);
    }
  }

  function handleAccessClinic(clinic: ClinicSummary) {
    const fullClinic: Clinic = {
      id: clinic.id,
      nome: clinic.nome,
      slug: clinic.slug,
      email: clinic.email,
      logo_url: clinic.logo_url,
      user_id: null,
      created_at: clinic.created_at,
      updated_at: clinic.created_at,
    };
    setSuperAdminClinic(fullClinic);
    navigate("/admin");
  }

  const totalClinics = clinics.length;
  const totalPatients = clinics.reduce((sum, c) => sum + c.total_pacientes, 0);
  const totalAppointments = clinics.reduce((sum, c) => sum + c.total_agendamentos_mes, 0);

  if (authLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Acesso Restrito
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-ink">Gestor Geral · Deby Saúde</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-2xl border border-border-strong bg-surface px-4 text-sm font-medium text-ink-secondary transition hover:bg-surface-low active:-translate-y-px"
              onClick={() => void loadClinics()}
              type="button"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Atualizar
            </button>
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-2xl bg-danger/10 px-4 text-sm font-medium text-danger transition hover:bg-danger/20 active:-translate-y-px"
              onClick={() => void logout()}
              type="button"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Cards de resumo geral */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard icon={Building2} label="Clínicas registradas" value={totalClinics} color="blue" />
          <SummaryCard icon={Users} label="Total de pacientes" value={totalPatients} color="green" />
          <SummaryCard icon={Calendar} label="Agendamentos este mês" value={totalAppointments} color="purple" />
        </div>

        {/* Lista de clínicas */}
        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-secondary">
            Todas as clínicas
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-danger/20 bg-danger/5 p-6 text-center">
              <p className="text-sm font-medium text-danger">{error}</p>
              <button
                className="mt-3 text-sm font-medium text-ink-secondary underline"
                onClick={() => void loadClinics()}
                type="button"
              >
                Tentar novamente
              </button>
            </div>
          ) : clinics.length === 0 ? (
            <div className="rounded-3xl border border-border bg-surface p-10 text-center">
              <Building2 className="mx-auto mb-3 h-8 w-8 text-ink-muted" />
              <p className="text-sm text-ink-secondary">Nenhuma clínica registrada no sistema.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clinics.map((clinic) => (
                <ClinicCard
                  key={clinic.id}
                  clinic={clinic}
                  onAccess={() => handleAccessClinic(clinic)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: "blue" | "green" | "purple";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${styles[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold tracking-tight text-ink">{value.toLocaleString("pt-BR")}</p>
      <p className="mt-1 text-sm text-ink-secondary">{label}</p>
    </div>
  );
}

function ClinicCard({
  clinic,
  onAccess,
}: {
  clinic: ClinicSummary;
  onAccess: () => void;
}) {
  return (
    <div className="flex flex-col rounded-3xl border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-modal">
      {/* Cabeçalho da clínica */}
      <div className="flex items-start gap-3">
        {clinic.logo_url ? (
          <img
            src={clinic.logo_url}
            alt={clinic.nome}
            className="h-11 w-11 rounded-2xl border border-border object-contain p-0.5"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-ink">{clinic.nome}</h3>
          <p className="truncate text-xs text-ink-secondary">{clinic.email}</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-2xl bg-canvas py-3">
        <div className="px-3 text-center">
          <p className="text-lg font-bold text-ink">{clinic.total_pacientes}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">Pacientes</p>
        </div>
        <div className="px-3 text-center">
          <p className="text-lg font-bold text-ink">{clinic.total_agendamentos_mes}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">Agend./mês</p>
        </div>
        <div className="px-3 text-center">
          <p className="text-lg font-bold text-ink">{clinic.total_profissionais}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">Profis.</p>
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
        <span className="flex items-center gap-1">
          <Stethoscope className="h-3 w-3" />
          Desde {new Date(clinic.created_at).toLocaleDateString("pt-BR")}
        </span>
      </div>

      <button
        className="group mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-dark active:-translate-y-px"
        onClick={onAccess}
        type="button"
      >
        Acessar Clínica
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
