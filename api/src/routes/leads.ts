import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { z } from "zod";
import { leadScopeWhere } from "../middleware/leadScope.js";
import { Role, LeadStatus } from "@prisma/client";
import { requireRole } from "../middleware/rbac.js";

const r = Router();
r.use(requireAuth);

r.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const stageId = req.query.stageId as string | undefined;
  const ownerId = req.query.ownerId as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  const where: any = {
    ...leadScopeWhere(req),
  };

  if (stageId) where.stageId = stageId;
  if (ownerId) where.ownerId = ownerId;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { source: { contains: q, mode: "insensitive" } },
    ];
  }

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { stage: true, owner: { select: { id: true, name: true, email: true } }, sale: true }
  });

  res.json({ leads });
});

r.post("/", async (req, res) => {
  const parsed = z.object({
    name: z.string().min(2),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    city: z.string().optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
    stageId: z.string(),
    ownerId: z.string().optional(),
    valueCents: z.number().int().min(0).optional()
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  // AGENT com leadScope OWN: força ownerId nele mesmo
  const u = req.user!;
  const ownerId = (u.role === "ADMIN" || u.role === "MANAGER") ? (parsed.data.ownerId ?? u.id) : u.id;

  const lead = await prisma.lead.create({
    data: {
      ...parsed.data,
      ownerId,
      valueCents: parsed.data.valueCents ?? 0
    },
    include: { stage: true, owner: { select: { id: true, name: true } }, sale: true }
  });

  res.json({ lead });
});

r.put("/:id", async (req, res) => {
  const parsed = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    city: z.string().optional().nullable(),
    source: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    ownerId: z.string().optional().nullable(),
    valueCents: z.number().int().min(0).optional(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  // Verifica escopo no update
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) return res.status(404).json({ error: "Not found" });

  const u = req.user!;
  if (u.role === "AGENT" && u.leadScope === "OWN" && lead.ownerId !== u.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // AGENT não muda ownerId
  const data: any = { ...parsed.data };
  if (u.role === "AGENT") delete data.ownerId;

  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data,
    include: { stage: true, owner: { select: { id: true, name: true } }, sale: true }
  });
  res.json({ lead: updated });
});

r.delete("/:id", async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) return res.status(404).json({ error: "Not found" });

  const u = req.user!;
  if (u.role === "AGENT" && u.leadScope === "OWN" && lead.ownerId !== u.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await prisma.lead.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

r.post("/:id/move", async (req, res) => {
  const parsed = z.object({ stageId: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } , include: { stage: true }});
  if (!lead) return res.status(404).json({ error: "Not found" });

  const u = req.user!;
  if (u.role === "AGENT" && u.leadScope === "OWN" && lead.ownerId !== u.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const dest = await prisma.stage.findUnique({ where: { id: parsed.data.stageId } });
  if (!dest) return res.status(400).json({ error: "Invalid stage" });

  const status = dest.isClosed ? LeadStatus.CLOSED : LeadStatus.OPEN;

  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      stageId: dest.id,
      status,
      closedAt: dest.isClosed ? (lead.closedAt ?? new Date()) : null
    },
    include: { stage: true, owner: { select: { id: true, name: true } }, sale: true }
  });

  res.json({ lead: updated });
});

r.post("/:id/mark-sold", async (req, res) => {
  const parsed = z.object({
    amountCents: z.number().int().min(0),
    planName: z.string().optional(),
    paymentRef: z.string().optional()
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const lead = await prisma.lead.findUnique({ where: { id: req.params.id }, include: { stage: true, sale: true } });
  if (!lead) return res.status(404).json({ error: "Not found" });

  const u = req.user!;
  if (u.role === "AGENT" && u.leadScope === "OWN" && lead.ownerId !== u.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!lead.stage.isClosed && lead.status !== LeadStatus.CLOSED) {
    return res.status(400).json({ error: "Lead must be in Fechados para dar baixa" });
  }
  if (lead.sale) return res.status(400).json({ error: "Sale already exists" });

  const sale = await prisma.sale.create({
    data: {
      leadId: lead.id,
      amountCents: parsed.data.amountCents,
      planName: parsed.data.planName,
      paymentRef: parsed.data.paymentRef
    }
  });

  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: { status: LeadStatus.SOLD },
    include: { stage: true, owner: { select: { id: true, name: true } }, sale: true }
  });

  res.json({ lead: updated, sale });
});

export default r;
