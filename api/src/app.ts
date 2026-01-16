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

  const allowedOrigins = env.CORS_ORIGIN
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, cb) => {
        // Requests sem Origin (curl, servidor-servidor) devem passar
        if (!origin) return cb(null, true);

        if (allowedOrigins.includes(origin)) return cb(null, true);

        // Opcional: loga pra você ver qual origin está chegando
        console.warn("CORS blocked origin:", origin);
        return cb(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      optionsSuccessStatus: 204,
    })
  );

  // garante preflight em qualquer rota
  app.options("*", cors());


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
