import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, KanbanSquare, BadgeCheck, Users, LogOut, SunMoon } from "lucide-react";
import { cn } from "../lib/cn";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/useTheme";
import { Button } from "../components/Button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/sales", label: "Vendas finalizadas", icon: BadgeCheck },
  { to: "/users", label: "Usuários", icon: Users },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { toggle } = useTheme();

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="flex">
        <aside className="w-[280px] p-4 hidden md:block">
          <div className="rounded-2xl border border-border bg-panel shadow-soft p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary">
                P
              </div>
              <div>
                <div className="font-semibold leading-tight">PoliticAll CRM</div>
                <div className="text-xs text-muted">{user?.name} • {user?.role}</div>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              {nav.map((n) => {
                const Icon = n.icon;
                return (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm border border-transparent",
                        "hover:bg-white/5",
                        isActive && "bg-white/5 border-border"
                      )
                    }
                  >
                    <Icon size={18} className="text-muted" />
                    <span>{n.label}</span>
                  </NavLink>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={toggle}>
                <SunMoon size={16} /> Tema
              </Button>
              <Button variant="danger" className="flex-1" onClick={logout}>
                <LogOut size={16} /> Sair
              </Button>
            </div>

            <div className="mt-4 text-xs text-muted">
              Dark predominante • cores: <span className="text-primary">primária</span> + <span className="text-accent">acento</span>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
