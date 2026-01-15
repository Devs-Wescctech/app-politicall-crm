import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { leadScopeWhere } from "../middleware/leadScope.js";

const r = Router();
r.use(requireAuth);

function rangeWhere(req: any) {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const where: any = { ...leadScopeWhere(req) };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  return where;
}

r.get("/summary", async (req, res) => {
  const where = rangeWhere(req);

  const [total, open, closed, sold] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, status: "OPEN" } }),
    prisma.lead.count({ where: { ...where, status: "CLOSED" } }),
    prisma.lead.count({ where: { ...where, status: "SOLD" } }),
  ]);

  const salesAgg = await prisma.sale.aggregate({
    where: { lead: where },
    _sum: { amountCents: true },
    _avg: { amountCents: true },
    _count: { _all: true }
  });

  const revenueCents = salesAgg._sum.amountCents ?? 0;
  const avgTicketCents = Math.round(salesAgg._avg.amountCents ?? 0);

  const conversion = total ? (sold / total) : 0;

  res.json({
    kpis: {
      total,
      open,
      closed,
      sold,
      revenueCents,
      avgTicketCents,
      conversion
    }
  });
});

r.get("/funnel", async (req, res) => {
  // conta por stage (ordenado)
  const where = rangeWhere(req);

  const stages = await prisma.stage.findMany({ orderBy: { order: "asc" } });
  const data = await Promise.all(stages.map(async (s) => {
    const count = await prisma.lead.count({ where: { ...where, stageId: s.id } });
    return { stageId: s.id, name: s.name, order: s.order, count, isClosed: s.isClosed };
  }));

  res.json({ funnel: data });
});

r.get("/timeseries", async (req, res) => {
  // simples: agrupa por dia no Node (ok para MVP)
  const where = rangeWhere(req);
  const leads = await prisma.lead.findMany({ where, select: { createdAt: true, status: true } });
  const sales = await prisma.sale.findMany({ where: { lead: where }, select: { createdAt: true, amountCents: true } });

  const byDay = (d: Date) => d.toISOString().slice(0, 10);

  const map: Record<string, any> = {};

  for (const l of leads) {
    const k = byDay(l.createdAt);
    map[k] ??= { day: k, leads: 0, sold: 0, revenueCents: 0 };
    map[k].leads += 1;
    if (l.status === "SOLD") map[k].sold += 1;
  }
  for (const s of sales) {
    const k = byDay(s.createdAt);
    map[k] ??= { day: k, leads: 0, sold: 0, revenueCents: 0 };
    map[k].revenueCents += s.amountCents;
  }

  const series = Object.values(map).sort((a: any, b: any) => a.day.localeCompare(b.day));
  res.json({ series });
});

export default r;
