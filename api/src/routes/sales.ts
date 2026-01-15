import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { z } from "zod";
import { leadScopeWhere } from "../middleware/leadScope.js";

const r = Router();
r.use(requireAuth);

r.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const planName = (req.query.planName as string | undefined)?.trim();
  const paid = req.query.paid as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  const leadWhere: any = {
    ...leadScopeWhere(req)
  };

  if (q) {
    leadWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }

  const where: any = {};
  if (planName) where.planName = { contains: planName, mode: "insensitive" };
  if (paid === "true") where.paidAt = { not: null };
  if (paid === "false") where.paidAt = null;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const sales = await prisma.sale.findMany({
    where: {
      ...where,
      lead: leadWhere
    },
    orderBy: { createdAt: "desc" },
    include: { lead: { include: { owner: { select: { id: true, name: true } }, stage: true } } }
  });

  res.json({ sales });
});

r.put("/:id", async (req, res) => {
  const parsed = z.object({
    paidAt: z.string().datetime().nullable().optional(),
    paymentRef: z.string().nullable().optional(),
    planName: z.string().nullable().optional(),
    amountCents: z.number().int().min(0).optional()
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const sale = await prisma.sale.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : parsed.data.paidAt
    },
    include: { lead: true }
  });

  res.json({ sale });
});

export default r;
