import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { cn } from "../lib/cn";
import { useAuth } from "../auth/AuthContext";
import {
  ShieldCheck,
  KanbanSquare,
  BadgeCheck,
  BarChart3,
  Users,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  CheckCircle2,
} from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();

  // ✅ mantém tema dark (para o sistema), mas a coluna da direita será "tom de branco"
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.add("dark");

    const meta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
    const prevMeta = meta?.content;
    if (meta) meta.content = "dark";

    return () => {
      if (!hadDark) root.classList.remove("dark");
      if (meta && prevMeta != null) meta.content = prevMeta;
    };
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [logoOk, setLogoOk] = useState(true);

  const features = useMemo(
    () => [
      {
        icon: <KanbanSquare size={18} />,
        title: "Pipeline (Kanban) moderno",
        desc: "Arraste leads por etapas com pan horizontal e layout esticado.",
      },
      {
        icon: <BadgeCheck size={18} />,
        title: "Baixa de venda e receita",
        desc: "Controle de baixas com valor, ticket médio e conversão.",
      },
      {
        icon: <BarChart3 size={18} />,
        title: "Dashboard com visões",
        desc: "KPIs, funil, série temporal e tendências do período.",
      },
      {
        icon: <Users size={18} />,
        title: "Usuários e responsáveis",
        desc: "Perfis e responsáveis por lead para organização do time.",
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
      {/* Fundo sutil */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_18%_10%,rgba(16,162,148,.22),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(760px_420px_at_82%_18%,rgba(99,102,241,.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,.03),transparent_28%,rgba(0,0,0,.22))]" />
      </div>

      <div className="min-h-screen w-full grid lg:grid-cols-12">
        {/* ESQUERDA */}
        <div className="hidden lg:block relative overflow-hidden border-r border-border/70 lg:col-span-7">
          <div className="absolute inset-0 bg-panel/35 backdrop-blur" />

          <div className="pointer-events-none absolute -top-20 -left-24 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,162,148,.26),transparent_62%)]" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,.18),transparent_62%)]" />

          <div className="relative z-10 flex flex-col h-full w-full p-10">
            <div className="flex items-center gap-4">
              <div className="h-[64px] w-[240px] rounded-2xl border border-border/70 bg-white/5 flex items-center justify-center overflow-hidden">
                {logoOk ? (
                  <img
                    src="/logo.png"
                    alt="PoliticAll"
                    className="w-auto max-w-[220px] object-contain select-none"
                    style={{ height: 44, display: "block" }}
                    onError={() => setLogoOk(false)}
                  />
                ) : (
                  <div className="h-[44px] w-[180px] rounded-xl bg-white/5 border border-border/70" />
                )}
              </div>

              <div className="ml-auto hidden xl:flex items-center gap-2 rounded-full border border-border/70 bg-white/5 px-3 py-1.5 text-xs text-muted">
                <Sparkles size={14} className="text-primary" />
                Interface moderna
              </div>
            </div>

            <div className="mt-12 max-w-2xl">
              <div className="text-4xl font-semibold tracking-tight leading-[1.08]">
                Pipeline, vendas e visão do funil em um CRM rápido e bonito.
              </div>

              {/* ✅ removido o texto: "Tudo no padrão visual do PoliticAll..." */}

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/5 px-3 py-1.5 text-xs text-muted">
                  <CheckCircle2 size={14} className="text-primary" />
                  Kanban com pan horizontal
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/5 px-3 py-1.5 text-xs text-muted">
                  <CheckCircle2 size={14} className="text-primary" />
                  Baixa de venda padrão
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/5 px-3 py-1.5 text-xs text-muted">
                  <CheckCircle2 size={14} className="text-primary" />
                  Dashboard com visões
                </span>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-3 max-w-2xl">
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

            <div className="mt-auto pt-10 text-xs text-muted flex items-center gap-2">
              <ShieldCheck size={14} className="text-primary" />
              © {new Date().getFullYear()} PoliticAll CRM
            </div>
          </div>
        </div>

        {/* DIREITA (tom de branco) */}
        <div className="lg:col-span-5 flex items-center justify-center p-4 md:p-10">
          <div className="w-full max-w-[480px]">
            <div
              className={cn(
                "rounded-3xl border shadow-[0_22px_60px_rgba(0,0,0,.28)] overflow-hidden",
                // ✅ tom branco "clean" mantendo harmonia com o sistema
                "bg-white/95 border-black/10"
              )}
            >
              <div className="p-6 border-b border-black/10">
                <div className="text-2xl font-semibold tracking-tight text-[#0b1220]">Entrar</div>
                <div className="mt-1 text-sm text-[#334155]">Use seu e-mail e senha para acessar.</div>
              </div>

              <form className="p-6 space-y-4" onSubmit={onSubmit}>
                <div>
                  <div className="text-sm mb-1 text-[#334155]">Email</div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]">
                      <Mail size={16} />
                    </span>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@..."
                      className={cn(
                        "pl-10",
                        // força o Input ficar claro aqui (sem depender do tema global)
                        "bg-white text-[#0b1220] border-black/10 placeholder:text-[#94a3b8] focus:ring-2 focus:ring-primary/30"
                      )}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-sm mb-1 text-[#334155]">Senha</div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]">
                      <Lock size={16} />
                    </span>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={cn(
                        "pl-10",
                        "bg-white text-[#0b1220] border-black/10 placeholder:text-[#94a3b8] focus:ring-2 focus:ring-primary/30"
                      )}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {err && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm">
                    <div className="text-red-700 font-semibold">Falha no login</div>
                    <div className="text-red-700/80 mt-1">{err}</div>
                  </div>
                )}

                <Button className="w-full" disabled={loading}>
                  <span className="flex items-center justify-center gap-2">
                    {loading ? "Entrando..." : "Entrar"}
                    <ArrowRight size={16} />
                  </span>
                </Button>
              </form>
            </div>

            <div className="mt-4 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/5 px-4 py-2 text-xs text-muted">
                <ShieldCheck size={14} className="text-primary" />
                PoliticAll • UI atual • Acesso seguro
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
