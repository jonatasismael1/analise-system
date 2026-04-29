import { FormEvent, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const { login, registerClinic, session, clinic, loading: authLoading } = useAuth();

  // Se já tiver sessão E clínica carregada, vai para o admin
  if (session && clinic && !authLoading) return <Navigate to="/admin" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormLoading(true);
    setError(null);

    if (isRegistering) {
      const result = await registerClinic(email, password, clinicName);
      if (result.error) {
        setError(result.error);
        setFormLoading(false);
        return;
      }
    } else {
      const result = await login(email, password);
      if (result.error) {
        setError(result.error);
        setFormLoading(false);
        return;
      }
    }

    // O AuthContext vai atualizar o estado de 'clinic' e 'session'
    // e o componente vai redirecionar automaticamente pelo if lá em cima
    setFormLoading(false);
  }

  const isLoading = formLoading || authLoading;

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-on-surface">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.06]">
        <img
          alt=""
          className="h-full w-full object-cover grayscale"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrLbFnjHRN213bA0Dy0UhEdnRWlFWvacLjYj7I0e6GvbNjds7GKFDdVlfhG0Jnu2pYpczlqvfOzTy_eZIbDcf1qZsjHDncfpkeksPOun9NQaV8_e7PJE84JSnrfOVo0YYu3zAt9QFNk8T8c2EylSO_Mjn5aP1w1-Q1yKpuCk6CXYJqTa0qam6nPim1T6o8agbNMwwegGTAJYb7KPRmwrPpDJGWa_4apOPO5WGkZCrfmTeprA88ZTGboBBecRMXdyjr5ZieA-3W1Gs"
        />
      </div>
      <main className="relative z-10 flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="mb-6 flex items-center justify-center">
              <img src="/logo-clinic-pro.png" alt="Clinic Pro" className="h-20 w-auto" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-on-surface">
              CLINIC PRO
            </h1>
            <p className="mt-2 text-sm font-medium text-secondary">
              {isRegistering ? "Comece sua jornada digital agora" : "Acesse sua central de inteligência clínica"}
            </p>
          </div>

          <div className="rounded-3xl border border-surface-variant bg-white/80 p-8 shadow-clinical backdrop-blur-xl">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {isRegistering && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-secondary" htmlFor="clinicName">
                    Nome da Clínica
                  </label>
                  <input
                    className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                    id="clinicName"
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="Ex: Clínica Bem Estar"
                    required
                    type="text"
                    value={clinicName}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary" htmlFor="email">
                  E-mail Profissional
                </label>
                <input
                  className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  type="email"
                  value={email}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-secondary" htmlFor="password">
                    Senha
                  </label>
                </div>
                <input
                  className="w-full rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  id="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                />
              </div>

              {error && (
                <div className="rounded-xl bg-error/10 p-3 text-xs font-medium text-error">
                  {error}
                </div>
              )}

              <button
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary py-4 text-sm font-bold text-white transition-all hover:bg-primary-dark disabled:opacity-70"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>{isRegistering ? "Criar Minha Clínica" : "Entrar no Sistema"}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button
                className="text-xs font-semibold text-secondary transition hover:text-primary"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError(null);
                }}
                type="button"
              >
                {isRegistering ? "Já tem uma conta? Faça login" : "Não tem conta? Registre sua clínica"}
              </button>
            </div>
          </div>

          <p className="mt-10 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-secondary">
            Clinical Modernism Design System
          </p>
        </div>
      </main>
    </div>
  );
}
