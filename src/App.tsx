import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminPage } from "./pages/AdminPage";
import { BookingPage } from "./pages/BookingPage";
import { LoginPage } from "./pages/LoginPage";
import { OrcamentoPublicPage } from "./pages/OrcamentoPublicPage";
import { TeleconsultaPage } from "./pages/TeleconsultaPage";
import { GestorPage } from "./pages/gestor/GestorPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="/gestor" element={<ProtectedRoute><GestorPage /></ProtectedRoute>} />
      <Route path="/agendar/:slug" element={<BookingPage />} />
      <Route path="/orcamento/:token" element={<OrcamentoPublicPage />} />
      <Route path="/teleconsulta/:token" element={<TeleconsultaPage />} />
    </Routes>
  );
}
