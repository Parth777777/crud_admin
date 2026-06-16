/**
 * AUTH CONTEXT  (the client side of login)
 * ----------------------------------------
 * React "context" lets any component read the logged-in user without passing
 * props down through every layer. This provider:
 *
 *   - On startup, if a token exists, asks GET /api/auth/me "who am I?".
 *   - Exposes `login`, `register`, and `logout`.
 *   - Stores the token (via tokenStore) so refresh keeps you signed in.
 *
 * Notice the dataflow: a form calls `login()` -> POST /api/auth/login -> server
 * verifies password -> returns {token, user} -> we save the token and set
 * `user` in state -> the whole app re-renders as "logged in".
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore } from "../lib/api";
import type { User } from "../lib/types";
import type { LoginInput, RegisterInput } from "@shared/schemas";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, try to restore the session from a stored token.
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ user: User }>("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  async function login(input: LoginInput) {
    const res = await api.post<{ token: string; user: User }>("/auth/login", input);
    tokenStore.set(res.data.token);
    setUser(res.data.user);
  }

  async function register(input: RegisterInput) {
    const res = await api.post<{ token: string; user: User }>("/auth/register", input);
    tokenStore.set(res.data.token);
    setUser(res.data.user);
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
