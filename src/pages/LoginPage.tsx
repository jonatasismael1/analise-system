import { FormEvent, useState } from "react";
import { ArrowRight, CalendarDays, CreditCard, Eye, EyeOff, Loader2, MessageCircle, Stethoscope } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { allowPublicSignup } from "../lib/appConfig";

// Mapeia erros do Supabase para mensagens amigáveis, sem revelar se o e-mail existe
function mapAuthError(msg: string): string {
  if (/invalid.?login.?credentials|invalid_credentials/i.test(msg)) {
    return "E-mail ou senha incorretos.";
  }
  if (/email.?not.?confirmed/i.test(msg)) {
    return "Confirme seu e-mail antes de entrar.";
  }
  if (/user.?already.?registered|already.?been.?registered/i.test(msg)) {
    return "Este e-mail já está cadastrado.";
  }
  return "Ocorreu um erro. Tente novamente.";
}

const inputClass =
  "w-full rounded-2xl border border-border-strong bg-surface px-4 py-2.5 text-sm text-ink outline-none transition-all duration-150 placeholder:text-ink-muted focus:border-blue-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(37,99,235,0.10)]";

const labelClass = "mb-1.5 block text-sm font-medium text-ink";

const features = [
  { icon: CalendarDays, label: "Agenda médica inteligente" },
  { icon: Stethoscope, label: "Prontuário eletrônico" },
  { icon: CreditCard, label: "Financeiro e caixa" },
  { icon: MessageCircle, label: "WhatsApp integrado" },
];

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, registerClinic, session, clinic, loading: authLoading, isSuperAdmin } = useAuth();

  if (session && !authLoading) {
    if (isSuperAdmin) return <Navigate to="/gestor" replace />;
    if (clinic) return <Navigate to="/admin" replace />;
  }

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
          setError(mapAuthError(result.error));
          setFormLoading(false);
          return;
        }
      } else {
        const result = await login(email, password);
        if (result.error) {
          setError(mapAuthError(result.error));
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

  const showNoClinicError = session && !clinic && !authLoading && !isSuperAdmin;
  const isLoading = formLoading || authLoading;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4 py-8">
      <div className="grid w-full max-w-[920px] overflow-hidden rounded-3xl border border-border shadow-modal md:grid-cols-[1fr_1fr]">

        {/* Painel esquerdo — identidade da marca */}
        <div
          className="hidden flex-col justify-between p-10 md:flex"
          style={{
            background: "linear-gradient(135deg, #1e40af 0%, #2563eb 45%, #3b82f6 100%)",
          }}
        >
          <div>
            <img src="/logo-deby-saude.png" alt="Deby Saúde" className="h-16 w-auto brightness-0 invert" />
            <div className="mt-8">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200">
                Sistema clínico
              </p>
              <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-white">
                Deby Saúde
              </h1>

              <p className="mt-4 text-sm leading-relaxed text-blue-100">
                Gestão clínica integrada para secretárias, médicos e administração.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm text-blue-100">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Painel direito — formulário */}
        <div className="bg-surface px-8 py-10">
          <div className="mb-8">
            <img src="/logo-deby-saude.png" alt="Deby Saúde" className="mb-6 h-12 w-auto md:hidden" />
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              {isRegistering ? "Criar conta" : "Bem-vindo de volta"}
            </h2>
            <p className="mt-1 text-sm text-ink-secondary">
              {isRegistering
                ? "Preencha os dados para cadastrar sua clínica."
                : "Acesse o painel com suas credenciais."}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegistering && allowPublicSignup && (
              <div>
                <label className={labelClass} htmlFor="clinicName">Nome da Clínica</label>
                <input
                  className={inputClass}
                  id="clinicName"
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Ex: Clínica Bem Estar"
                  required
                  type="text"
                  value={clinicName}
                />
              </div>
            )}

            <div>
              <label className={labelClass} htmlFor="email">E-mail</label>
              <input
                className={inputClass}
                id="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                type="email"
                value={email}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="password">Senha</label>
              <div className="relative">
                <input
                  className={inputClass}
                  id="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  onClick={() => setShowPassword((v) => !v)}
                  type="button"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {showNoClinicError && (
              <div className="rounded-2xl border border-yellow-100 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-700">
                Usuário autenticado, mas nenhuma clínica encontrada. Entre em contato com o suporte.
              </div>
            )}

            {!allowPublicSignup && (
              <div className="rounded-2xl border border-border-strong bg-surface-low px-4 py-3 text-sm text-ink-secondary">
                Acesso exclusivo para clínicas cadastradas.
              </div>
            )}

            <button
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-dark active:-translate-y-px active:shadow-primary-press disabled:opacity-60"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>{isRegistering && allowPublicSignup ? "Criar Minha Clínica" : "Entrar no Sistema"}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {allowPublicSignup ? (
            <div className="mt-6 text-center">
              <button
                className="text-sm font-medium text-ink-secondary transition hover:text-primary"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError(null);
                }}
                type="button"
              >
                {isRegistering ? "Já tem uma conta? Faça login" : "Não tem conta? Registre sua clínica"}
              </button>
            </div>
          ) : null}

          <p className="mt-8 text-center text-[10px] font-medium uppercase tracking-[0.15em] text-ink-muted">
            Deby Saúde · Operação clínica integrada
          </p>
        </div>
      </div>
    </div>
  );
}
