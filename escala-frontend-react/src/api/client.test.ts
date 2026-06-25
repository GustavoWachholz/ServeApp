import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, setLogoutCallback, setToastCallback } from './client';

const SESSION_KEY = 'serve_session';

function mockFetch(status: number, body?: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body ?? {}),
  } as Response);
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', mockFetch(200, { ok: true }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch – Bearer injection', () => {
  it('adds Authorization header when token exists in session', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'abc123' }));
    const fetchSpy = mockFetch(200, {});
    vi.stubGlobal('fetch', fetchSpy);

    await apiFetch('/api/test');

    const calledHeaders = fetchSpy.mock.calls[0][1].headers as Headers;
    expect(calledHeaders.get('Authorization')).toBe('Bearer abc123');
  });

  it('does not add Authorization header when no session', async () => {
    const fetchSpy = mockFetch(200, {});
    vi.stubGlobal('fetch', fetchSpy);

    await apiFetch('/api/test');

    const calledHeaders = fetchSpy.mock.calls[0][1].headers as Headers;
    expect(calledHeaders.get('Authorization')).toBeNull();
  });
});

describe('apiFetch – 401 handling', () => {
  it('calls logout callback when token exists and non-auth endpoint returns 401', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'tok123' }));
    const logoutCb = vi.fn();
    setLogoutCallback(logoutCb);
    vi.stubGlobal('fetch', mockFetch(401));

    await expect(apiFetch('/api/servos')).rejects.toThrow('Sessão expirada');
    expect(logoutCb).toHaveBeenCalledOnce();
  });

  it('does NOT call logout callback when no token (unauthenticated 401)', async () => {
    const logoutCb = vi.fn();
    setLogoutCallback(logoutCb);
    vi.stubGlobal('fetch', mockFetch(401));

    await expect(apiFetch('/api/servos')).rejects.toThrow('Sessão expirada');
    expect(logoutCb).not.toHaveBeenCalled();
  });

  it('does NOT call logout callback on 401 from auth endpoint even with token', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'tok123' }));
    const logoutCb = vi.fn();
    setLogoutCallback(logoutCb);
    vi.stubGlobal('fetch', mockFetch(401));

    await expect(apiFetch('/api/auth/login')).rejects.toThrow('Sessão expirada');
    expect(logoutCb).not.toHaveBeenCalled();
  });
});

describe('apiFetch – 403 handling', () => {
  it('calls toast callback with error on 403', async () => {
    const toastCb = vi.fn();
    setToastCallback(toastCb);
    vi.stubGlobal('fetch', mockFetch(403));

    await expect(apiFetch('/api/test')).rejects.toThrow('Acesso negado');
    expect(toastCb).toHaveBeenCalledWith('Acesso negado.', 'error');
  });
});
