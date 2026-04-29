import { FormEvent, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { allowPublicSignup } from "../lib/appConfig";

export function LoginPage() {
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

    try {
      if (isRegistering) {
        if (!allowPublicSignup) {
          setError("Acesso exclusivo para clínicas cadastradas.");
          setFormLoading(false);
          return;
        }
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
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro inesperado.");
    } finally {
      setFormLoading(false);
    }
  }

  // Se logou mas não tem clínica (ex: usuário de teste sem clínica)
  const showNoClinicError = session && !clinic && !authLoading;

  const isLoading = formLoading || authLoading;

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-on-surface">
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

          <div className="rounded-lg border border-surface-variant bg-white/95 p-8 shadow-clinical">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {isRegistering && allowPublicSignup && (
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

              {showNoClinicError && (
                <div className="rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-700 border border-amber-200">
                  Usuário autenticado, mas nenhuma clínica encontrada. Entre em contato com o suporte.
                </div>
              )}

              {!allowPublicSignup && (
                <div className="rounded-xl border border-surface-variant bg-surface-container-low p-3 text-xs font-medium text-secondary">
                  Acesso exclusivo para clínicas cadastradas.
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
                    <span>{isRegistering && allowPublicSignup ? "Criar Minha Clínica" : "Entrar no Sistema"}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {allowPublicSignup ? <div className="mt-8 text-center">
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
            </div> : null}
          </div>

          <p className="mt-10 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-secondary">
            Clinical Modernism Design System
          </p>
        </div>
      </main>
    </div>
  );
}
