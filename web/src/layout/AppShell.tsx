import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  KanbanSquare,
  BadgeCheck,
  Users,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  Search,
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

function pageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/pipeline")) return "Pipeline";
  if (pathname.startsWith("/sales")) return "Vendas finalizadas";
  if (pathname.startsWith("/users")) return "Usuários";
  return "Painel";
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Fundo sutil */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_18%_10%,rgba(16,162,148,.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(760px_420px_at_82%_18%,rgba(99,102,241,.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,.03),transparent_28%,rgba(0,0,0,.22))]" />
      </div>

      <div className="flex min-h-screen w-full">
        {/* Sidebar FIXO (não scrolla junto) e ocupando toda área esquerda (sem “contorno/card”) */}
        <aside className="hidden md:block fixed left-0 top-0 h-screen w-[320px] border-r border-border/70 bg-panel/60 backdrop-blur z-30">
          <div className="flex h-full flex-col p-4">
            {/* Brand / User */}
            <div className="px-1 pt-1 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <Sparkles className="text-primary" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold leading-tight truncate">PoliticAll CRM</div>
                  <div className="text-xs text-muted truncate">
                    {user?.name} • {user?.role}
                  </div>
                </div>
              </div>
            </div>

            {/* NAV (scroll interno se precisar) */}
            <div className="flex-1 overflow-y-auto pr-1">
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
                          <span
                            className={cn(
                              "grid place-items-center h-9 w-9 rounded-2xl bg-white/5 border transition",
                              isActive
                                ? "border-border"
                                : "border-border/70 group-hover:border-border"
                            )}
                          >
                            <Icon
                              size={18}
                              className={cn(
                                isActive ? "text-text" : "text-muted group-hover:text-text"
                              )}
                            />
                          </span>

                          <span className="font-medium">{n.label}</span>

                          <span
                            className={cn(
                              "ml-auto h-2.5 w-2.5 rounded-full transition",
                              isActive
                                ? "bg-primary"
                                : "bg-transparent border border-border/70 group-hover:border-border"
                            )}
                          />
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* Ações fixas no rodapé */}
            <div className="pt-4">
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
            </div>
          </div>
        </aside>

        {/* Main: precisa “abrir espaço” para sidebar fixa */}
        <main className="flex min-h-screen flex-1 flex-col md:ml-[320px]">
          {/* Topbar sticky */}
          <header className="sticky top-0 z-20 border-b border-border/60 bg-panel/50 backdrop-blur">
            <div className="flex items-center gap-3 px-4 md:px-8 py-4">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted">KPI, gráficos e filtros</div>
                <div className="text-lg font-semibold tracking-tight truncate">
                  {pageTitle(pathname)}
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-white/5 px-3 h-10">
                  <Search size={16} className="text-muted" />
                  <input
                    className="w-[320px] bg-transparent text-sm outline-none placeholder:text-muted/70"
                    placeholder="Buscar lead, cidade, telefone..."
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Conteúdo */}
          <div className="flex-1 px-4 md:px-8 py-6">
            <div className="w-full max-w-[1250px]">{children}</div>
          </div>

          <footer className="border-t border-border/60 bg-panel/30 px-4 md:px-8 py-4 text-xs text-muted">
            © {new Date().getFullYear()} PoliticAll CRM
          </footer>
        </main>
      </div>
    </div>
  );
}
