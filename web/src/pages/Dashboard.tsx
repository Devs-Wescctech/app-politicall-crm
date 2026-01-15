import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "../components/Card";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { api, moneyBRLFromCents } from "../lib/api";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";

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

export default function Dashboard() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [funnel, setFunnel] = useState<FunnelItem[]>([]);
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [from, to]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [s, f, t] = await Promise.all([
          api<Summary>(`/dashboard/summary${qs}`),
          api<{ funnel: FunnelItem[] }>(`/dashboard/funnel${qs}`),
          api<{ series: SeriesItem[] }>(`/dashboard/timeseries${qs}`),
        ]);
        if (!cancelled) {
          setSummary(s);
          setFunnel(f.funnel);
          setSeries(t.series);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [qs]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div>
          <div className="text-2xl font-semibold">Dashboard</div>
          <div className="text-sm text-muted">KPIs, gráficos e filtros</div>
        </div>
        <div className="flex-1" />
        <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
          <div>
            <div className="text-xs text-muted mb-1">De</div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Até</div>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      {loading && <div className="text-sm text-muted">Carregando...</div>}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardHeader><div className="text-sm text-muted">Total de leads</div></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{summary.kpis.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><div className="text-sm text-muted">Leads em aberto</div></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{summary.kpis.open}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><div className="text-sm text-muted">Vendidos</div></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{summary.kpis.sold}</div></CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted">Receita (vendas finalizadas)</div>
                  <div className="text-2xl font-semibold">{moneyBRLFromCents(summary.kpis.revenueCents)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted">Ticket médio</div>
                  <div className="text-lg font-semibold">{moneyBRLFromCents(summary.kpis.avgTicketCents)}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="leads" strokeWidth={2} />
                    <Area type="monotone" dataKey="sold" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="text-sm text-muted">Conversão</div>
              <div className="text-2xl font-semibold">{Math.round(summary.kpis.conversion * 100)}%</div>
            </CardHeader>
            <CardContent className="text-sm text-muted">
              Fechados: {summary.kpis.closed}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">Funil por etapa (pipeline)</div>
            <div className="text-xs text-muted">Quantos leads em cada stage</div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel}>
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

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">Observações</div>
            <div className="text-xs text-muted">MVP pronto pra evoluir</div>
          </CardHeader>
          <CardContent className="text-sm text-muted space-y-2">
            <div>• Filtros por data (from/to) no dashboard</div>
            <div>• KPIs: total, aberto, fechado, vendido, receita, ticket médio</div>
            <div>• Próximo passo fácil: filtros por usuário/origem, export CSV, logs/timeline</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
