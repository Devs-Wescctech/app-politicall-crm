import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role as Role)) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}
