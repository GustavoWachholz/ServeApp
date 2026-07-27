import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { PrivacidadePage } from './pages/PrivacidadePage';
import { AreasPage } from './pages/AreasPage';
import { MinisteriosPage } from './pages/MinisteriosPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { AuditoriaPage } from './pages/AuditoriaPage';
import { ServosPage } from './pages/ServosPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { PerfilPage } from './pages/PerfilPage';
import { DashboardPage } from './pages/DashboardPage';
import { IndisponibilidadesPage } from './pages/IndisponibilidadesPage';
import { LucideIcons } from './lib/lucide';

// Agenda carrega FullCalendar + html2canvas (pesados) — code-split por rota.
const AgendaPage = lazy(() => import('./pages/AgendaPage').then((m) => ({ default: m.AgendaPage })));

function PageFallback() {
  return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Carregando…</p>;
}

export default function App() {
  return (
    <>
    <LucideIcons />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacidade" element={<PrivacidadePage />} />

      <Route
        element={
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route
          path="agenda"
          element={
            <ProtectedRoute requireTela="AGENDA">
              <Suspense fallback={<PageFallback />}>
                <AgendaPage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="servos"
          element={
            <ProtectedRoute requireTela="SERVOS">
              <ServosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="areas"
          element={
            <ProtectedRoute requireTela="AREAS">
              <AreasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="ministerios"
          element={
            <ProtectedRoute requireTela="MINISTERIOS">
              <MinisteriosPage />
            </ProtectedRoute>
          }
        />

        <Route path="relatorios" element={<RelatoriosPage />} />

        <Route path="indisponibilidades" element={<IndisponibilidadesPage />} />

        <Route path="perfil" element={<PerfilPage />} />

        <Route
          path="usuarios"
          element={
            <ProtectedRoute requireAdmin>
              <UsuariosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="auditoria"
          element={
            <ProtectedRoute requireAdmin>
              <AuditoriaPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
