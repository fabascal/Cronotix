import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "superadmin" | "admin" | "user";
  /** '*' = superadmin (all access); otherwise list of menu slugs */
  permissions: string[];
  credits: number;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** true when user.permissions includes '*' or the given slug */
  can: (slug: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("access_token"));
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async (accessToken: string) => {
    try {
      const { data } = await apiClient.get<User>("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setUser({ ...data, permissions: data.permissions ?? [] });
    } catch {
      setToken(null);
      setUser(null);
      localStorage.removeItem("access_token");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      void fetchMe(token);
    } else {
      setIsLoading(false);
    }
  }, [token, fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<{ access_token: string; user: User }>(
      "/api/v1/auth/login",
      { email, password },
    );
    localStorage.setItem("access_token", data.access_token);
    setToken(data.access_token);
    setUser({ ...data.user, permissions: data.user.permissions ?? [] });
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    setToken(null);
    setUser(null);
  }, []);

  const can = useCallback(
    (slug: string) => {
      if (!user) return false;
      return user.permissions.includes("*") || user.permissions.includes(slug);
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!user, isLoading, can, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
