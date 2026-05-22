import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { ToastContainer } from "./components/ui/ToastContainer";
import { cleanupLegacyServiceWorker } from "./lib/serviceWorkerCleanup";
import "./styles/global.css";

cleanupLegacyServiceWorker();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <ToastContainer />
          <ConfirmDialog />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
