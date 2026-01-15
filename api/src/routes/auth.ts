import { Router } from "express";
import { prisma } from "../prisma.js";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

r.post("/login", async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid payload" });

  const user = await prisma.user.findUnique({ where: { email: body.data.email } });
  if (!user || !user.active) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(body.data.password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role, leadScope: user.leadScope });
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, leadScope: user.leadScope }
  });
});

r.get("/me", requireAuth, async (req, res) => {
  const u = req.user!;
  return res.json({ user: u });
});

export default r;
