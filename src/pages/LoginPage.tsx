import { FormEvent, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { allowPublicSignup } from "../lib/appConfig";

const inputClass =
  "w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-all duration-150 placeholder:text-ink-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(21,168,152,0.15)]";

const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink-secondary";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const { login, registerClinic, session, clinic, loading: authLoading } = useAuth();

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

  const showNoClinicError = session && !clinic && !authLoading;
  const isLoading = formLoading || authLoading;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4">
      {/* Split layout: esquerda institucional, direita formulário */}
      <div className="grid w-full max-w-[900px] overflow-hidden rounded-xl border border-[rgba(21,168,152,0.12)] shadow-modal md:grid-cols-[1fr_1fr]">

        {/* Painel esquerdo — identidade da marca */}
        <div className="hidden flex-col justify-between bg-sidebar p-10 md:flex">
          <div>
            <img src="/logo-analise.png" alt="Análise Saúde System" className="h-12 w-auto" />
            <div className="mt-8">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#7A9490]">Sistema clínico</p>
              <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-[#E4F5F3]">
                Análise Saúde<br />System
              </h1>
              <p className="mt-4 text-[14px] leading-relaxed text-[#7A9490]">
                Gestão clínica integrada para secretárias, médicos e administração.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {["Agenda médica inteligente", "Prontuário eletrônico", "Financeiro e caixa", "WhatsApp integrado"].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DC9B5]" />
                <span className="text-[12.5px] text-[#8AA5A0]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Painel direito — formulário */}
        <div className="bg-surface px-8 py-10">
          <div className="mb-8">
            {/* Logo apenas no mobile */}
            <img src="/logo-analise.png" alt="Análise Saúde" className="mb-6 h-10 w-auto md:hidden" />
            <h2 className="text-[18px] font-bold tracking-tight text-ink">
              {isRegistering ? "Criar conta" : "Bem-vindo de volta"}
            </h2>
            <p className="mt-1 text-[13px] text-ink-secondary">
              {isRegistering ? "Preencha os dados para cadastrar sua clínica." : "Acesse o painel com suas credenciais."}
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
              <input
                className={inputClass}
                id="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                type="password"
                value={password}
              />
            </div>

            {error && (
              <div className="rounded-md border border-danger-border bg-danger-wash px-3.5 py-2.5 text-[13px] font-medium text-danger">
                {error}
              </div>
            )}

            {showNoClinicError && (
              <div className="rounded-md border border-amber-200 bg-warning-wash px-3.5 py-2.5 text-[13px] font-medium text-warning">
                Usuário autenticado, mas nenhuma clínica encontrada. Entre em contato com o suporte.
              </div>
            )}

            {!allowPublicSignup && (
              <div className="rounded-md border border-border-strong bg-surface-low px-3.5 py-2.5 text-[13px] text-ink-secondary">
                Acesso exclusivo para clínicas cadastradas.
              </div>
            )}

            <button
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-[14px] font-semibold text-white transition-all duration-150 hover:bg-primary-dark active:-translate-y-px active:shadow-primary-press disabled:opacity-60"
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
                className="text-[12.5px] font-medium text-ink-secondary transition hover:text-primary"
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
            Análise Saúde · Operação clínica integrada
          </p>
        </div>
      </div>
    </div>
  );
}
