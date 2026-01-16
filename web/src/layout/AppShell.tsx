import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  KanbanSquare,
  BadgeCheck,
  Users,
  LogOut,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
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
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-[300px] p-4">
          <div className="sticky top-4">
            <div className="rounded-3xl border border-border bg-panel/70 backdrop-blur shadow-soft overflow-hidden">
              {/* Brand */}
              <div className="p-5 border-b border-border/70">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                    <Sparkles className="text-primary" size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold leading-tight truncate">PoliticAll CRM</div>
                    <div className="text-xs text-muted truncate">{user?.name} • {user?.role}</div>
                  </div>
                </div>
              </div>

              {/* Nav */}
              <div className="p-3">
                <div className="px-2 pb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
                  Navegação
                </div>
                <div className="space-y-1">
                  {nav.map((n) => {
                    const Icon = n.icon;
                    return (
                      <NavLink key={n.to} to={n.to}>
                        {({ isActive }) => (
                          <div
                            className={cn(
                              "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
                              "hover:bg-white/5",
                              isActive
                                ? "bg-white/5 ring-1 ring-border/60 shadow-soft text-text"
                                : "text-muted"
                            )}
                          >
                            <span className={cn(
                              "grid place-items-center h-9 w-9 rounded-2xl bg-white/5 border transition",
                              isActive ? "border-border" : "border-border/70 group-hover:border-border"
                            )}>
                              <Icon size={18} className={cn(isActive ? "text-text" : "text-muted group-hover:text-text")} />
                            </span>
                            <span className="font-medium">{n.label}</span>
                            <span
                              className={cn(
                                "ml-auto h-2.5 w-2.5 rounded-full transition",
                                isActive ? "bg-primary" : "bg-transparent border border-border/70 group-hover:border-border"
                              )}
                            />
                          </div>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border/70">
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 justify-center" onClick={toggle}>
                    {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                    <span className="ml-2">Tema</span>
                  </Button>
                  <Button variant="danger" className="flex-1 justify-center" onClick={logout}>
                    <LogOut size={16} />
                    <span className="ml-2">Sair</span>
                  </Button>
                </div>

                <div className="mt-3 text-xs text-muted">
                  Primária (dark): <span className="text-primary font-semibold">#10A294</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
