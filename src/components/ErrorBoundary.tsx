import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro ao renderizar o app", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6 text-on-surface">
          <section className="w-full max-w-md rounded-xl border border-surface-variant bg-white p-6 text-center shadow-clinical">
            <img src="/logo-analise.png" alt="Análise Saúde System" className="mx-auto h-14 w-auto" />
            <h1 className="mt-5 text-xl font-bold">Não foi possível carregar o painel</h1>
            <p className="mt-2 text-sm leading-6 text-secondary">
              Atualize a pagina. Se continuar, limpe o cache do navegador ou abra em uma janela anonima.
            </p>
            <button
              className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
              onClick={() => window.location.reload()}
              type="button"
            >
              Recarregar
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
