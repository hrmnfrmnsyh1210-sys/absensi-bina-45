import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SessionUser } from '../types';

interface AuthState {
  token: string | null;
  user: SessionUser | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<SessionUser>;
  logout: () => void;
  apiFetch: (input: string, init?: RequestInit) => Promise<Response>;
}

const STORAGE_KEY = 'absensi.auth';

const AuthContext = createContext<AuthContextValue | null>(null);

function loadState(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AuthState;
  } catch {
    // abaikan
  }
  return { token: null, user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadState);

  const persist = useCallback((next: AuthState) => {
    setState(next);
    if (next.token) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<SessionUser> => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login gagal');
      persist({ token: data.token, user: data.user });
      return data.user as SessionUser;
    },
    [persist],
  );

  const logout = useCallback(() => {
    const token = state.token;
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    persist({ token: null, user: null });
  }, [persist, state.token]);

  const apiFetch = useCallback(
    (input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (state.token) headers.set('Authorization', `Bearer ${state.token}`);
      if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(input, { ...init, headers });
    },
    [state.token],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout, apiFetch }),
    [state, login, logout, apiFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
