
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

import { apiRequest, ApiError } from "../api";

export type User = {
  id: string;
  name: string;
  email: string;
};

type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error";

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  // Check whether the browser has a valid session
  const checkSession = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      setStatus("loading");
      setError(null);

      try {
        const data = await apiRequest<{ user: User }>(
          "/auth/me",
          { signal }
        );

        if (signal?.aborted) return;

        setUser(data.user);
        setStatus("authenticated");
      } catch (err) {
        if (signal?.aborted) return;

        if (err instanceof ApiError && err.status === 401) {
          setUser(null);
          setStatus("unauthenticated");
          return;
        }

        setUser(null);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to check your session"
        );
        setStatus("error");
      }
    },
    []
  );

  // Restore authentication when the app loads
  useEffect(() => {
    const controller = new AbortController();

    void checkSession(controller.signal);

    return () => controller.abort();
  }, [checkSession]);

  async function login(
    email: string,
    password: string
  ): Promise<void> {
    const data = await apiRequest<{
      message: string;
      user: User;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    setUser(data.user);
    setError(null);
    setStatus("authenticated");
  }

  async function logout(): Promise<void> {
    await apiRequest<{ message: string }>(
      "/auth/logout",
      { method: "POST" }
    );

    setUser(null);
    setError(null);
    setStatus("unauthenticated");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        error,
        login,
        logout,
        refresh: () => checkSession()
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
