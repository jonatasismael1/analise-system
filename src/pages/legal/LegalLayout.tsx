import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";

/**
 * Layout compartilhado das páginas legais (Privacidade e Termos).
 * Mantém o mesmo cabeçalho/rodapé nas duas para evitar duplicação de chrome.
 */
export function LegalLayout({
  title,
  subtitle,
  lastUpdated,
  children,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly lastUpdated: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* Cabeçalho */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/login" className="flex items-center gap-2">
            <img src="/logo-deby-saude.png" alt="Deby Saúde" className="h-8 w-auto" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-ink-secondary transition hover:bg-surface-low"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-ink-secondary">{subtitle}</p>
          <p className="mt-1 text-xs text-ink-muted">Última atualização: {lastUpdated}</p>
        </div>

        <article className="space-y-7 text-sm leading-relaxed text-ink-secondary">
          {children}
        </article>
      </main>

      {/* Rodapé */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-ink-muted sm:flex-row">
          <span>© {new Date().getFullYear()} Deby Saúde · CNPJ 57.105.377/0001-22</span>
          <nav className="flex items-center gap-4">
            <Link to="/privacidade" className="transition hover:text-primary">Privacidade</Link>
            <Link to="/termos" className="transition hover:text-primary">Termos de Uso</Link>
            <Link to="/login" className="transition hover:text-primary">Entrar</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** Bloco de seção padronizado: título + conteúdo. */
export function LegalSection({
  id,
  title,
  children,
}: {
  readonly id?: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
