const SESSION_KEY = 'serve_session';
const TIMEOUT_MS = 15_000;

type LogoutCallback = () => void;
type ToastCallback = (msg: string, tipo: 'error' | 'warning' | 'info' | 'success') => void;

let onLogout: LogoutCallback | null = null;
let onToast: ToastCallback | null = null;

export function setLogoutCallback(cb: LogoutCallback) {
  onLogout = cb;
}

export function setToastCallback(cb: ToastCallback) {
  onToast = cb;
}

function getToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { token?: string }).token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const isAuthEndpoint = path.includes('/api/auth/');

  if (response.status === 401) {
    if (!isAuthEndpoint && token) {
      onLogout?.();
    }
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (response.status === 403) {
    onToast?.('Acesso negado.', 'error');
    throw new Error('Acesso negado.');
  }

  if (response.status === 404) {
    console.warn(`[API] Rota não encontrada: ${path}`);
    throw new Error('Recurso não encontrado.');
  }

  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
      else if (body?.error) message = body.error;
      else if (typeof body === 'string') message = body;
    } catch {}
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body != null ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: body != null ? JSON.stringify(body) : undefined }),
  delete: <T = void>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
