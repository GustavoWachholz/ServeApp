import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setLogoutCallback } from '../api/client';
import { logout as apiLogout } from '../api/auth';
import { decodeJwtPayload } from '../utils/jwt';
import type { SessionData, PermissaoDTO, UsuarioResponseDTO } from '../types';

const SESSION_KEY = 'serve_session';
const FOTO_KEY = 'serve_session_foto';

interface AuthContextValue {
  session: SessionData | null;
  foto: string | null;
  isAdmin: () => boolean;
  podeAcessar: (tela: string) => boolean;
  podeCriar: (tela: string) => boolean;
  podeEditar: (tela: string) => boolean;
  podeExcluir: (tela: string) => boolean;
  salvarSessao: (data: UsuarioResponseDTO) => void;
  atualizarFoto: (foto: string | null) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function lerSessao(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

function lerFoto(): string | null {
  return sessionStorage.getItem(FOTO_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(lerSessao);
  const [foto, setFoto] = useState<string | null>(lerFoto);

  const salvarSessao = useCallback((data: UsuarioResponseDTO) => {
    const { foto: fotoData, ...rest } = data;
    localStorage.setItem(SESSION_KEY, JSON.stringify(rest));
    if (fotoData) {
      sessionStorage.setItem(FOTO_KEY, fotoData);
    } else {
      sessionStorage.removeItem(FOTO_KEY);
    }
    setSession(rest);
    setFoto(fotoData ?? null);
  }, []);

  const atualizarFoto = useCallback((novaFoto: string | null) => {
    if (novaFoto) {
      sessionStorage.setItem(FOTO_KEY, novaFoto);
    } else {
      sessionStorage.removeItem(FOTO_KEY);
    }
    setFoto(novaFoto);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {}
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(FOTO_KEY);
    setSession(null);
    setFoto(null);
  }, []);

  const isAdmin = useCallback((): boolean => {
    if (!session?.token) return false;
    const claims = decodeJwtPayload(session.token);
    return claims?.role === 'ADMIN';
  }, [session]);

  const getPermissao = useCallback(
    (tela: string): PermissaoDTO | undefined =>
      session?.permissoes?.find((p) => p.tela === tela),
    [session]
  );

  const podeAcessar = useCallback(
    (tela: string) => isAdmin() || (getPermissao(tela)?.acessar ?? false),
    [isAdmin, getPermissao]
  );
  const podeCriar = useCallback(
    (tela: string) => isAdmin() || (getPermissao(tela)?.criar ?? false),
    [isAdmin, getPermissao]
  );
  const podeEditar = useCallback(
    (tela: string) => isAdmin() || (getPermissao(tela)?.editar ?? false),
    [isAdmin, getPermissao]
  );
  const podeExcluir = useCallback(
    (tela: string) => isAdmin() || (getPermissao(tela)?.excluir ?? false),
    [isAdmin, getPermissao]
  );

  useEffect(() => {
    setLogoutCallback(() => {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(FOTO_KEY);
      setSession(null);
      setFoto(null);
      window.location.href = '/login';
    });
  }, []);

  const value = useMemo(
    () => ({
      session,
      foto,
      isAdmin,
      podeAcessar,
      podeCriar,
      podeEditar,
      podeExcluir,
      salvarSessao,
      atualizarFoto,
      logout,
    }),
    [session, foto, isAdmin, podeAcessar, podeCriar, podeEditar, podeExcluir, salvarSessao, atualizarFoto, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
