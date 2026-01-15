import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { prisma } from "../prisma.js";
import { z } from "zod";
import { Role } from "@prisma/client";

const r = Router();

r.use(requireAuth);

r.get("/", async (_req, res) => {
  const stages = await prisma.stage.findMany({ orderBy: { order: "asc" } });
  res.json({ stages });
});

r.post("/", requireRole([Role.ADMIN]), async (req, res) => {
  const parsed = z.object({
    name: z.string().min(2),
    order: z.number().int().min(1),
    isClosed: z.boolean().optional()
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const stage = await prisma.stage.create({ data: { ...parsed.data, isClosed: parsed.data.isClosed ?? false } });
  res.json({ stage });
});

r.put("/:id", requireRole([Role.ADMIN]), async (req, res) => {
  const parsed = z.object({
    name: z.string().min(2).optional(),
    order: z.number().int().min(1).optional(),
    isClosed: z.boolean().optional()
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const stage = await prisma.stage.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ stage });
});

r.post("/reorder", requireRole([Role.ADMIN]), async (req, res) => {
  const parsed = z.object({
    order: z.array(z.object({ id: z.string(), order: z.number().int().min(1) }))
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  await prisma.$transaction(parsed.data.order.map(o => prisma.stage.update({ where: { id: o.id }, data: { order: o.order } })));
  res.json({ ok: true });
});

export default r;
