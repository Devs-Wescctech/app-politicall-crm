import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

export type Role = "ADMIN" | "MANAGER" | "AGENT";
export type LeadScope = "OWN" | "ALL";

export type Me = {
  id: string;
  email: string;
  name: string;
  role: Role;
  leadScope: LeadScope;
};

type AuthState = {
  token: string | null;
  user: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) { setLoading(false); return; }
      try {
        const data = await api<{ user: Me }>("/auth/me");
        if (!cancelled) setUser(data.user);
      } catch {
        localStorage.removeItem("token");
        if (!cancelled) { setToken(null); setUser(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  const login = async (email: string, password: string) => {
    const data = await api<{ token: string; user: Me }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ token, user, loading, login, logout }), [token, user, loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
