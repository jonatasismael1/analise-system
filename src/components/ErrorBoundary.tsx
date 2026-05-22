import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly errorMessage: string;
  readonly errorStack: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: "", errorStack: "" };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message ?? String(error),
      errorStack: error?.stack ?? "",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro ao renderizar o app", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6 text-on-surface">
          <section className="w-full max-w-lg rounded-xl border border-surface-variant bg-white p-6 text-center shadow-clinical">
            <img src="/logo-analise.png" alt="Análise Saúde System" className="mx-auto h-14 w-auto" />
            <h1 className="mt-5 text-xl font-bold">Não foi possível carregar o painel</h1>
            <p className="mt-2 text-sm leading-6 text-secondary">
              Ocorreu um erro inesperado. Detalhes abaixo.
            </p>
            {this.state.errorMessage && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-left">
                <p className="text-xs font-semibold text-red-700">Erro:</p>
                <p className="mt-1 break-all font-mono text-xs text-red-600">{this.state.errorMessage}</p>
                {this.state.errorStack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-red-500">Stack trace</summary>
                    <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[10px] text-red-400">
                      {this.state.errorStack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            <div className="mt-5 flex justify-center gap-3">
              <button
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                onClick={() => window.location.reload()}
                type="button"
              >
                Recarregar
              </button>
              <button
                className="rounded-lg border border-surface-variant px-4 py-2 text-sm font-medium text-secondary hover:bg-gray-50"
                onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.href = "/login"; }}
                type="button"
              >
                Voltar ao login
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
