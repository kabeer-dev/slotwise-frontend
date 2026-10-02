'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, api, configureApi } from './api';
import { TOKEN_STORAGE_KEY } from './config';
import type { AuthResponse, Business, User } from './types';

type AuthState =
  | { status: 'loading'; user: null; business: null; token: null }
  | { status: 'anonymous'; user: null; business: null; token: null }
  | { status: 'authenticated'; user: User; business: Business; token: string };

interface AuthContextValue {
  state: AuthState;
  login(email: string, password: string): Promise<void>;
  signup(fullName: string, email: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const ANONYMOUS: AuthState = { status: 'anonymous', user: null, business: null, token: null };

function readToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}
function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode) — session lasts until reload */
  }
}

/**
 * JWT kept in memory + localStorage and sent as a Bearer token.
 * Tradeoff documented in the README: simple and works across domains
 * (Vercel ↔ Render) but readable by XSS; production would move it to an
 * httpOnly cookie behind a same-site API domain.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, business: null, token: null });
  const tokenRef = useRef<string | null>(null);

  const logout = useCallback(() => {
    tokenRef.current = null;
    writeToken(null);
    queryClient.clear();
    setState(ANONYMOUS);
  }, [queryClient]);

  useEffect(() => {
    configureApi({ getToken: () => tokenRef.current, onUnauthorized: logout });
  }, [logout]);

  // Restore the session on load.
  useEffect(() => {
    const token = readToken();
    if (!token) {
      setState(ANONYMOUS);
      return;
    }
    tokenRef.current = token;
    configureApi({ getToken: () => tokenRef.current, onUnauthorized: logout });
    api.auth
      .me()
      .then(({ user, business }) => setState({ status: 'authenticated', user, business, token }))
      .catch((err) => {
        // Network error: keep the token and let the user retry; auth error: sign out.
        if (err instanceof ApiError && err.status === 401) logout();
        else setState(ANONYMOUS);
      });
  }, [logout]);

  const accept = useCallback((res: AuthResponse) => {
    tokenRef.current = res.token;
    writeToken(res.token);
    setState({ status: 'authenticated', user: res.user, business: res.business, token: res.token });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      login: async (email, password) => accept(await api.auth.login({ email, password })),
      signup: async (fullName, email, password) => accept(await api.auth.signup({ fullName, email, password })),
      logout,
    }),
    [state, accept, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For components that only render when signed in. */
export function useSession() {
  const { state } = useAuth();
  if (state.status !== 'authenticated') throw new Error('useSession requires an authenticated user');
  return state;
}
