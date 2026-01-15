import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./env.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import stageRoutes from "./routes/stages.js";
import leadRoutes from "./routes/leads.js";
import salesRoutes from "./routes/sales.js";
import dashboardRoutes from "./routes/dashboard.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("combined"));

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map(s => s.trim()),
      credentials: true,
    })
  );

  app.use("/health", (_req, res) => res.json({ ok: true }));

  // Rate limit para auth
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50 });

  app.use("/api/v1/auth", authLimiter, authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/stages", stageRoutes);
  app.use("/api/v1/leads", leadRoutes);
  app.use("/api/v1/sales", salesRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  });

  return app;
}
