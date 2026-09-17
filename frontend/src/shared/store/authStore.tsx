import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "../types/auth";

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: AuthUser | null;
}

interface AuthContextValue extends AuthState {
  setSession: (accessToken: string, user?: AuthUser | null) => void;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Holds the access JWT only in memory (never localStorage/sessionStorage) per the
 * Secure-by-Default research decision - mitigates XSS-based token theft. The refresh
 * token lives exclusively in an HttpOnly cookie set by the backend and is never
 * readable from JavaScript.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const setSession = useCallback((token: string, nextUser?: AuthUser | null) => {
    setAccessToken(token);
    if (nextUser !== undefined) {
      setUser(nextUser);
    }
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: accessToken !== null,
      accessToken,
      user,
      setSession,
      clearSession,
    }),
    [accessToken, user, setSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthStore(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthStore must be used within an AuthProvider");
  }
  return ctx;
}
