import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { useAuth } from "../auth/AuthContext";
import { cn } from "../lib/cn";
import { Lock, Mail, ShieldCheck, KanbanSquare, BadgeCheck, BarChart3, Users, ArrowRight } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("admin@politicall.local");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const features = useMemo(
    () => [
      {
        icon: <KanbanSquare size={18} />,
        title: "Pipeline (Kanban)",
        desc: "Arraste leads por etapas, com pan horizontal e etapas esticadas.",
      },
      {
        icon: <BadgeCheck size={18} />,
        title: "Vendas finalizadas",
        desc: "Baixe vendas com valor, controle de receita e ticket médio.",
      },
      {
        icon: <BarChart3 size={18} />,
        title: "Dashboard",
        desc: "KPIs, funil e série temporal com filtros por período.",
      },
      {
        icon: <Users size={18} />,
        title: "Usuários e permissões",
        desc: "Perfis ADMIN/MANAGER/AGENT e responsáveis por leads.",
      },
    ],
    []
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(email, password);
      nav("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao logar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Fundo sutil (mesmo padrão do AppShell) */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_18%_10%,rgba(16,162,148,.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(760px_420px_at_82%_18%,rgba(99,102,241,.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,.03),transparent_28%,rgba(0,0,0,.22))]" />
      </div>

      <div className="min-h-screen w-full grid lg:grid-cols-2">
        {/* ESQUERDA: branding + funcionalidades */}
        <div className="hidden lg:flex relative overflow-hidden border-r border-border/70">
          <div className="absolute inset-0 bg-panel/40 backdrop-blur" />
          <div className="relative z-10 flex flex-col h-full w-full p-10">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/25 grid place-items-center">
                <ShieldCheck size={22} className="text-primary" />
              </div>

              <div className="min-w-0">
                <div className="text-2xl font-semibold tracking-tight">PoliticAll CRM</div>
                <div className="text-sm text-muted">Pipeline • Vendas • Dashboard • Usuários</div>
              </div>
            </div>

            {/* Hero */}
            <div className="mt-10">
              <div className="text-3xl font-semibold tracking-tight leading-tight">
                Controle de leads em um pipeline moderno, rápido e bonito.
              </div>
              <div className="mt-3 text-sm text-muted max-w-xl">
                Tenha visão de funil, receita, conversão e responsáveis. Uma experiência de uso atual, com layout “esticado”
                e navegação fluida.
              </div>
            </div>

            {/* Lista de features */}
            <div className="mt-10 grid grid-cols-1 gap-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-border/70 bg-white/5 px-5 py-4 shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-2xl border border-border/70 bg-white/5 grid place-items-center text-text">
                      {f.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold">{f.title}</div>
                      <div className="mt-1 text-sm text-muted">{f.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-8 text-xs text-muted">
              © {new Date().getFullYear()} PoliticAll CRM • Ambiente seguro • Autenticação JWT
            </div>
          </div>
        </div>

        {/* DIREITA: formulário */}
        <div className="flex items-center justify-center p-4 md:p-10">
          <div className="w-full max-w-[460px]">
            {/* Logo no mobile */}
            <div className="lg:hidden mb-6 rounded-2xl border border-border/70 bg-panel/60 backdrop-blur p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-primary/15 border border-primary/25 grid place-items-center">
                  <ShieldCheck size={20} className="text-primary" />
                </div>
                <div>
                  <div className="text-lg font-semibold">PoliticAll CRM</div>
                  <div className="text-sm text-muted">Acesse para entrar no painel</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-panel/60 backdrop-blur shadow-soft overflow-hidden">
              <div className="p-6 border-b border-border/60">
                <div className="text-2xl font-semibold tracking-tight">Entrar</div>
                <div className="mt-1 text-sm text-muted">
                  Use seu e-mail e senha para acessar o dashboard.
                </div>
              </div>

              <form className="p-6 space-y-4" onSubmit={onSubmit}>
                <div>
                  <div className="text-sm mb-1 text-muted">Email</div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                      <Mail size={16} />
                    </span>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@..."
                      className="pl-10"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-sm mb-1 text-muted">Senha</div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                      <Lock size={16} />
                    </span>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {err && (
                  <div className="rounded-2xl border border-border/70 bg-white/5 p-3 text-sm">
                    <div className="text-danger font-semibold">Falha no login</div>
                    <div className="text-muted mt-1">{err}</div>
                  </div>
                )}

                <Button className="w-full" disabled={loading}>
                  <span className="flex items-center justify-center gap-2">
                    {loading ? "Entrando..." : "Entrar"}
                    <ArrowRight size={16} />
                  </span>
                </Button>

                <div className="text-xs text-muted">
                  Seed padrão:{" "}
                  <span className="font-semibold text-text">admin@politicall.local</span> /{" "}
                  <span className="font-semibold text-text">admin123</span> (trocar em produção)
                </div>
              </form>

              <div className="px-6 py-4 border-t border-border/60 bg-panel/30 text-xs text-muted">
                Dica: use usuários com perfil <span className="text-text font-semibold">ADMIN</span> para configurar permissões e responsáveis.
              </div>
            </div>

            {/* pequeno “badge” de status */}
            <div className="mt-4 flex items-center justify-center">
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/5 px-4 py-2 text-xs text-muted"
                )}
              >
                <ShieldCheck size={14} className="text-primary" />
                Login seguro • Interface moderna
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
