export const appMode = import.meta.env.VITE_APP_MODE === "demo" ? "demo" : "production";
export const isDemoMode = appMode === "demo";
export const allowPublicSignup = import.meta.env.VITE_ALLOW_PUBLIC_SIGNUP === "true";
export const productionDataErrorMessage =
  "Não foi possível carregar os dados da clínica. Verifique sua conexão ou tente novamente.";
