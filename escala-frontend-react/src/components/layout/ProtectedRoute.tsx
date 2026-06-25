import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  requireAdmin?: boolean;
  requireTela?: string;
}

export function ProtectedRoute({ children, requireAdmin, requireTela }: Props) {
  const { session, isAdmin, podeAcessar } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  if (requireTela && !podeAcessar(requireTela)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
