import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { prisma } from "../prisma.js";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role, LeadScope } from "@prisma/client";

const r = Router();

r.use(requireAuth);

r.get("/", requireRole([Role.ADMIN, Role.MANAGER]), async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, leadScope: true, active: true, createdAt: true }
  });
  res.json({ users });
});

r.post("/", requireRole([Role.ADMIN, Role.MANAGER]), async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.nativeEnum(Role).optional(),
    leadScope: z.nativeEnum(LeadScope).optional(),
    active: z.boolean().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const hash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hash,
      role: parsed.data.role ?? Role.AGENT,
      leadScope: parsed.data.leadScope ?? LeadScope.OWN,
      active: parsed.data.active ?? true
    },
    select: { id: true, name: true, email: true, role: true, leadScope: true, active: true }
  });

  res.json({ user });
});

r.put("/:id", requireRole([Role.ADMIN, Role.MANAGER]), async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.nativeEnum(Role).optional(),
    leadScope: z.nativeEnum(LeadScope).optional(),
    active: z.boolean().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const data: any = { ...parsed.data };
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, name: true, email: true, role: true, leadScope: true, active: true }
  });

  res.json({ user });
});

r.delete("/:id", requireRole([Role.ADMIN, Role.MANAGER]), async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ ok: true });
});

export default r;
