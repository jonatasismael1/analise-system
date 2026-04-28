import { FormEvent, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, registerClinic, session } = useAuth();

  if (session) return <Navigate to="/admin" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    
    if (isRegistering) {
      const result = await registerClinic(email, password, clinicName);
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Se registrar com sucesso, tenta logar ou avisa para confirmar e-mail
      const loginRes = await login(email, password);
      if (loginRes.error) {
        setError("Clínica criada! Por favor, faça login.");
        setIsRegistering(false);
        return;
      }
    } else {
      const result = await login(email, password);
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
    }

    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/admin";
    navigate(from, { replace: true });
  }

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
        <section className="flex w-full max-w-[420px] flex-col gap-8 rounded-xl border border-outline-variant bg-white p-8 shadow-modal">
          <div className="flex flex-col items-center gap-3 text-center">
            <img src="/logo-clinic-pro.png" alt="Clinic Pro" className="h-16 w-auto mb-2" />
            <div>
              <h1 className="text-xl font-bold text-on-surface">{isRegistering ? "Criar Nova Clínica" : "Acesso Clínico"}</h1>
              <p className="mt-1 text-sm leading-6 text-secondary">
                {isRegistering ? "Registre sua clínica para começar a gerenciar seus pacientes." : "Entre com suas credenciais para acessar o painel administrativo."}
              </p>
            </div>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {isRegistering && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Nome da Clínica</span>
                <input
                  className="rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => setClinicName(event.target.value)}
                  placeholder="Ex: Clínica Sorriso"
                  type="text"
                  value={clinicName}
                  required
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">E-mail</span>
              <input
                className="rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                type="email"
                value={email}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Senha</span>
              <input
                className="rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type="password"
                value={password}
                required
              />
            </label>

            {error ? (
              <p className="rounded-lg bg-error-container px-4 py-2.5 text-sm text-error">
                {error}
              </p>
            ) : null}

            <button
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold uppercase tracking-wide text-white transition hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isRegistering ? "Criando..." : "Validando..."}
                </>
              ) : (
                <>
                  {isRegistering ? "Criar Minha Clínica" : "Acessar Painel"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex flex-col gap-3 text-center">
            <button
              onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {isRegistering ? "Já tenho uma conta? Entrar" : "Não tem conta? Cadastre sua clínica"}
            </button>
          </div>

          <div className="border-t border-surface-variant pt-4 text-center text-xs text-secondary leading-relaxed">
            Ao se cadastrar, você concorda com nossos Termos de Uso. O acesso é imediato após a criação da conta.
          </div>
        </section>
      </main>

      <footer className="relative z-10 flex flex-col items-center justify-between gap-3 border-t border-surface-variant bg-white px-6 py-5 text-xs font-medium uppercase tracking-wider text-secondary md:flex-row">
        <span>© 2026 Clinic Pro</span>
        <span className="text-primary">Gestão Clínica Profissional</span>
      </footer>
    </div>
  );
}
