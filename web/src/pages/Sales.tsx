import React, { useEffect, useMemo, useState } from "react";
import { api, moneyBRLFromCents } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/Card";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Button } from "../components/Button";

type SaleRow = {
  id: string;
  amountCents: number;
  planName?: string | null;
  paidAt?: string | null;
  paymentRef?: string | null;
  createdAt: string;
  lead: {
    id: string;
    name: string;
    owner?: { id: string; name: string } | null;
  };
};

export default function Sales() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [q, setQ] = useState("");
  const [paid, setPaid] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (paid) p.set("paid", paid);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [q, paid, from, to]);

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ sales: SaleRow[] }>(`/sales${qs}`);
      setRows(data.sales);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const total = rows.reduce((acc, r) => acc + (r.amountCents ?? 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Vendas finalizadas</div>
        <div className="text-sm text-muted">Leads baixados (Fechados → Dar baixa)</div>
      </div>

      <Card>
        <CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar (nome/email/telefone)..." />
            <Select value={paid} onChange={(e) => setPaid(e.target.value)}>
              <option value="">Pago (todos)</option>
              <option value="true">Pago</option>
              <option value="false">Não pago</option>
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <Button variant="outline" onClick={load}>Aplicar filtros</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted">{loading ? "Carregando..." : `${rows.length} registros`}</div>
            <div className="text-sm font-semibold">Total: {moneyBRLFromCents(total)}</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted">
                <tr className="border-b border-border">
                  <th className="text-left py-2">Lead</th>
                  <th className="text-left py-2">Responsável</th>
                  <th className="text-left py-2">Plano</th>
                  <th className="text-left py-2">Valor</th>
                  <th className="text-left py-2">Pago</th>
                  <th className="text-left py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-2">{r.lead?.name}</td>
                    <td className="py-2 text-muted">{r.lead?.owner?.name ?? "-"}</td>
                    <td className="py-2 text-muted">{r.planName ?? "-"}</td>
                    <td className="py-2 font-medium">{moneyBRLFromCents(r.amountCents)}</td>
                    <td className="py-2">{r.paidAt ? "Sim" : "Não"}</td>
                    <td className="py-2 text-muted">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
                {!rows.length && !loading && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted">Nenhuma venda encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
