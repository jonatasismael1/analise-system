import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminPage } from "./pages/AdminPage";
import { BookingPage } from "./pages/BookingPage";
import { LoginPage } from "./pages/LoginPage";
import { OrcamentoPublicPage } from "./pages/OrcamentoPublicPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="/agendar/:slug" element={<BookingPage />} />
      <Route path="/orcamento/:token" element={<OrcamentoPublicPage />} />
    </Routes>
  );
}
