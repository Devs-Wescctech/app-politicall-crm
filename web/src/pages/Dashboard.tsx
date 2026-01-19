import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "../components/Card";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { api, moneyBRLFromCents } from "../lib/api";
import { Button } from "../components/Button";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CalendarDays,
  TrendingUp,
  BadgeCheck,
  Users,
  Filter,
  RefreshCcw,
  Target,
  Coins,
  Layers,
  Activity,
} from "lucide-react";
import { cn } from "../lib/cn";

type Summary = {
  kpis: {
    total: number;
    open: number;
    closed: number;
    sold: number;
    revenueCents: number;
    avgTicketCents: number;
    conversion: number;
  };
};

type FunnelItem = { stageId: string; name: string; order: number; count: number; isClosed: boolean };
type SeriesItem = { day: string; leads: number; sold: number; revenueCents: number };

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function fmtPct(n: number) {
  return `${Math.round(clampPct(n) * 100)}%`;
}

function safeNum(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function fmtBRLFromCents(cents: number) {
  return moneyBRLFromCents(safeNum(cents));
}

function getWindowPreset(p: string) {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);

  const d = new Date(today);
  if (p === "7d") d.setDate(d.getDate() - 6);
  else if (p === "30d") d.setDate(d.getDate() - 29);
  else if (p === "90d") d.setDate(d.getDate() - 89);
  else return { from: "", to: "" };

  const from = d.toISOString().slice(0, 10);
  return { from, to };
}

function KPI({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <Card className="bg-panel/60 border-border shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted">{label}</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight">{value}</div>
          </div>
          <div className="h-11 w-11 rounded-2xl border border-border/70 bg-white/5 grid place-items-center">
            {icon}
          </div>
        </div>
      </CardHeader>
      {hint ? <CardContent className="pt-0 text-xs text-muted">{hint}</CardContent> : null}
    </Card>
  );
}

export default function Dashboard() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preset, setPreset] = useState<string>("30d");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [funnel, setFunnel] = useState<FunnelItem[]>([]);
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);

  // visões
  const [chartMode, setChartMode] = useState<"leads" | "revenue">("leads");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [from, to]);

  // aplica preset inicial
  useEffect(() => {
    const w = getWindowPreset(preset);
    if (w.from && w.to) {
      setFrom(w.from);
      setTo(w.to);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [s, f, t] = await Promise.all([
        api<Summary>(`/dashboard/summary${qs}`),
        api<{ funnel: FunnelItem[] }>(`/dashboard/funnel${qs}`),
        api<{ series: SeriesItem[] }>(`/dashboard/timeseries${qs}`),
      ]);
      setSummary(s);
      setFunnel(f.funnel ?? []);
      setSeries(t.series ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  const funnelSorted = useMemo(() => {
    return [...(funnel ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [funnel]);

  const topStages = useMemo(() => {
    const sorted = [...(funnelSorted ?? [])].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
    return sorted.slice(0, 6);
  }, [funnelSorted]);

  const pieData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "Abertos", value: safeNum(summary.kpis.open) },
      { name: "Fechados", value: safeNum(summary.kpis.closed) },
      { name: "Vendidos", value: safeNum(summary.kpis.sold) },
    ].filter((x) => x.value > 0);
  }, [summary]);

  const pieColors = ["rgba(99,102,241,.55)", "rgba(16,162,148,.55)", "rgba(245,158,11,.55)"];

  const derived = useMemo(() => {
    if (!summary) {
      return {
        soldRate: 0,
        closeRate: 0,
        revenuePerLeadCents: 0,
        trendLeads: 0,
        trendSold: 0,
        trendRevenueCents: 0,
      };
    }

    const total = safeNum(summary.kpis.total);
    const sold = safeNum(summary.kpis.sold);
    const closed = safeNum(summary.kpis.closed);
    const revenueCents = safeNum(summary.kpis.revenueCents);

    const soldRate = total ? sold / total : 0;
    const closeRate = total ? closed / total : 0;
    const revenuePerLeadCents = total ? Math.round(revenueCents / total) : 0;

    // tendência simples: últimos 7 dias vs 7 dias anteriores (se tiver série suficiente)
    const s = series ?? [];
    const last14 = s.slice(-14);
    const prev7 = last14.slice(0, 7);
    const last7 = last14.slice(7, 14);

    const sum = (arr: SeriesItem[], key: keyof SeriesItem) => arr.reduce((acc, it) => acc + safeNum(it[key]), 0);

    const prevLeads = sum(prev7, "leads");
    const lastLeads = sum(last7, "leads");
    const prevSold = sum(prev7, "sold");
    const lastSold = sum(last7, "sold");
    const prevRev = sum(prev7, "revenueCents");
    const lastRev = sum(last7, "revenueCents");

    const pct = (a: number, b: number) => (a === 0 ? (b > 0 ? 1 : 0) : (b - a) / a);

    return {
      soldRate,
      closeRate,
      revenuePerLeadCents,
      trendLeads: pct(prevLeads, lastLeads),
      trendSold: pct(prevSold, lastSold),
      trendRevenueCents: pct(prevRev, lastRev),
    };
  }, [summary, series]);

  function applyPreset(p: string) {
    setPreset(p);
    const w = getWindowPreset(p);
    setFrom(w.from);
    setTo(w.to);
  }

  return (
    <div className="space-y-5">
      {/* Header estilizado (cores do sistema) */}
      <div className="rounded-2xl border border-border bg-panel/60 p-4 md:p-5 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="min-w-0">
            <div className="text-2xl font-semibold tracking-tight">Dashboard</div>
            <div className="mt-1 text-sm text-muted">
              Visões rápidas • Tendências • Funil • Receita
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-end">
            {/* preset */}
            <div className="w-full md:w-[180px]">
              <div className="text-xs text-muted mb-1 flex items-center gap-2">
                <Filter size={14} /> Janela
              </div>
              <Select value={preset} onChange={(e) => applyPreset(e.target.value)}>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
                <option value="custom">Personalizado</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
              <div>
                <div className="text-xs text-muted mb-1 flex items-center gap-2">
                  <CalendarDays size={14} /> De
                </div>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setPreset("custom");
                    setFrom(e.target.value);
                  }}
                />
              </div>
              <div>
                <div className="text-xs text-muted mb-1 flex items-center gap-2">
                  <CalendarDays size={14} /> Até
                </div>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setPreset("custom");
                    setTo(e.target.value);
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={load}>
                <RefreshCcw size={16} /> Atualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {loading && <div className="text-sm text-muted">Carregando...</div>}

      {summary && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <KPI
              label="Total de leads"
              value={summary.kpis.total}
              icon={<Users size={18} className="text-muted" />}
              hint={
                <span>
                  Conversão: <span className="text-text font-semibold">{fmtPct(summary.kpis.conversion)}</span>
                </span>
              }
            />

            <KPI
              label="Em aberto"
              value={summary.kpis.open}
              icon={<Layers size={18} className="text-muted" />}
              hint={
                <span>
                  Taxa de fechamento:{" "}
                  <span className="text-text font-semibold">{fmtPct(derived.closeRate)}</span>
                </span>
              }
            />

            <KPI
              label="Vendidos"
              value={summary.kpis.sold}
              icon={<BadgeCheck size={18} className="text-muted" />}
              hint={
                <span>
                  Taxa de venda: <span className="text-text font-semibold">{fmtPct(derived.soldRate)}</span>
                </span>
              }
            />

            <KPI
              label="Receita"
              value={fmtBRLFromCents(summary.kpis.revenueCents)}
              icon={<Coins size={18} className="text-muted" />}
              hint={
                <span>
                  Ticket médio:{" "}
                  <span className="text-text font-semibold">{fmtBRLFromCents(summary.kpis.avgTicketCents)}</span>
                </span>
              }
            />
          </div>

          {/* Linha de visões extras */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="bg-panel/60 border-border shadow-soft">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted">Receita por lead</div>
                    <div className="text-xl font-semibold">{fmtBRLFromCents(derived.revenuePerLeadCents)}</div>
                  </div>
                  <div className="h-11 w-11 rounded-2xl border border-border/70 bg-white/5 grid place-items-center">
                    <Target size={18} className="text-muted" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted">
                Média da receita distribuída pelo total de leads no período.
              </CardContent>
            </Card>

            <Card className="bg-panel/60 border-border shadow-soft">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted">Tendência (7d)</div>
                    <div className="text-xl font-semibold">
                      Leads {derived.trendLeads >= 0 ? "↑" : "↓"} {fmtPct(Math.abs(derived.trendLeads))}
                    </div>
                  </div>
                  <div className="h-11 w-11 rounded-2xl border border-border/70 bg-white/5 grid place-items-center">
                    <TrendingUp size={18} className="text-muted" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted">
                Comparação dos últimos 7 dias com os 7 dias anteriores (se houver dados).
              </CardContent>
            </Card>

            <Card className="bg-panel/60 border-border shadow-soft">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted">Tendência (7d)</div>
                    <div className="text-xl font-semibold">
                      Receita {derived.trendRevenueCents >= 0 ? "↑" : "↓"} {fmtPct(Math.abs(derived.trendRevenueCents))}
                    </div>
                  </div>
                  <div className="h-11 w-11 rounded-2xl border border-border/70 bg-white/5 grid place-items-center">
                    <Activity size={18} className="text-muted" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted">
                Ajuda a ver se o período está acelerando ou desacelerando.
              </CardContent>
            </Card>
          </div>

          {/* Gráfico principal + distribuição */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="md:col-span-2 bg-panel/60 border-border shadow-soft">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted">Evolução diária</div>
                    <div className="text-lg font-semibold">Leads x Vendas (e Receita opcional)</div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    <div className="w-full md:w-[200px]">
                      <Select value={chartMode} onChange={(e) => setChartMode(e.target.value as any)}>
                        <option value="leads">Mostrar Leads/Vendas</option>
                        <option value="revenue">Mostrar Receita</option>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartMode === "leads" ? (
                      <AreaChart data={series}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="leads" strokeWidth={2} />
                        <Area type="monotone" dataKey="sold" strokeWidth={2} />
                      </AreaChart>
                    ) : (
                      <LineChart data={series}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip
                          formatter={(v: any, name: any) => {
                            if (name === "revenueCents") return [fmtBRLFromCents(v), "Receita"];
                            return [v, name];
                          }}
                        />
                        <Line type="monotone" dataKey="revenueCents" strokeWidth={2} dot={false} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-panel/60 border-border shadow-soft">
              <CardHeader>
                <div className="text-sm text-muted">Distribuição</div>
                <div className="text-lg font-semibold">Status no período</div>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip />
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Abertos</span>
                    <span className="font-semibold">{summary.kpis.open}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Fechados</span>
                    <span className="font-semibold">{summary.kpis.closed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Vendidos</span>
                    <span className="font-semibold">{summary.kpis.sold}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Funil + Top etapas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="bg-panel/60 border-border shadow-soft">
          <CardHeader>
            <div className="text-sm text-muted">Pipeline</div>
            <div className="text-lg font-semibold">Funil por etapa</div>
            <div className="text-xs text-muted">Quantos leads existem em cada stage</div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelSorted}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-panel/60 border-border shadow-soft">
          <CardHeader>
            <div className="text-sm text-muted">Visão rápida</div>
            <div className="text-lg font-semibold">Top etapas (concentração)</div>
            <div className="text-xs text-muted">Onde o volume está acumulando</div>
          </CardHeader>
          <CardContent className="space-y-2">
            {topStages.length === 0 ? (
              <div className="text-sm text-muted">Sem dados no período.</div>
            ) : (
              topStages.map((s) => (
                <div
                  key={s.stageId}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-white/5 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.name}</div>
                    <div className="text-xs text-muted">Etapa #{s.order}</div>
                  </div>
                  <div className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
                    {s.count}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Observações (menor e mais alinhado ao tema) */}
      <Card className="bg-panel/60 border-border shadow-soft">
        <CardHeader>
          <div className="text-sm text-muted">Evolução</div>
          <div className="text-lg font-semibold">Próximas visões fáceis de adicionar</div>
        </CardHeader>
        <CardContent className="text-sm text-muted space-y-2">
          <div>• Filtro por responsável/origem no dashboard (se tiver endpoint)</div>
          <div>• Ranking de responsáveis: volume, conversão e receita</div>
          <div>• Tempo médio por etapa (lead aging) e gargalos</div>
          <div>• Exportação CSV e timeline/logs</div>
        </CardContent>
      </Card>
    </div>
  );
}
