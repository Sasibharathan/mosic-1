import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axiosInstance from "../utils/axiosInstance";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthUser = {
  username: string;
  gmail: string;
  contact: string;
  status: number;
  profile: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

type LoginPayload = {
  gmail: string;
  password: string;
};

type RegisterPayload = {
  username: string;
  gmail: string;
  password: string;
  contact?: string;
  status?: number;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: false;     // always false — kept so existing consumers don't break
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<string>;
  logout: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Synchronous storage reader (runs before first paint) ─────────────────────

function readStoredAuth(): AuthState {
  try {
    const token = localStorage.getItem("token");
    const raw   = localStorage.getItem("user");
    if (token && raw) {
      const user = JSON.parse(raw) as AuthUser;
      return { token, user };
    }
  } catch {
    // Corrupted JSON in storage — wipe it so the app doesn't get stuck
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
  return { token: null, user: null };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  /**
   * THE FIX: pass readStoredAuth as a lazy initializer (no parentheses).
   * React calls it synchronously before the first render, so `auth.token`
   * is already populated when ProtectedRoute first evaluates — no redirect.
   */
  const [auth, setAuth] = useState<AuthState>(readStoredAuth);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (payload: LoginPayload) => {
    const response = await axiosInstance.post<{
      token: string;
      username: string;
      gmail: string;
      contact: string;
      status: number;
      profile: string;
    }>("/api/auth/login", payload);

    const { token, username, gmail, contact, status, profile } = response.data;
    const user: AuthUser = { username, gmail, contact, status, profile };

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setAuth({ token, user });
  }, []);

  // ── Register (admin-only, requires JWT) ───────────────────────────────────
  const register = useCallback(
    async (payload: RegisterPayload): Promise<string> => {
      const response = await axiosInstance.post<{ message: string }>(
        "/api/auth/register",
        payload,
      );
      return response.data.message;
    },
    [],
  );

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuth({ token: null, user: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token:           auth.token,
      user:            auth.user,
      isAuthenticated: auth.token !== null,
      isLoading:       false,
      login,
      register,
      logout,
    }),
    [auth, login, register, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}