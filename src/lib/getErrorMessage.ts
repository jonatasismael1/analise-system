export function getErrorMessage(error: unknown) {
  if (typeof error === "string") return error;

  if (error && typeof error === "object") {
    const maybeError = error as { message?: unknown; code?: unknown; details?: unknown };
    const message = typeof maybeError.message === "string" ? maybeError.message : "";
    const code = typeof maybeError.code === "string" ? maybeError.code : "";

    if (/failed to fetch|network|conex/i.test(message)) {
      return "Erro de conexão. Tente novamente.";
    }

    if (/violates|invalid|check constraint|not-null|null value|duplicate|unique/i.test(message) || code.startsWith("23")) {
      return message || "Revise os dados informados e tente novamente.";
    }

    if (message) return message;
  }

  return "Ocorreu um erro inesperado.";
}
