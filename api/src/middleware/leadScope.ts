import type { Request } from "express";

/**
 * Retorna filtro prisma para leads baseado no escopo do usuário.
 * - ADMIN/MANAGER: sempre ALL
 * - AGENT:
 *   - OWN: ownerId = user.id
 *   - ALL: sem filtro
 */
export function leadScopeWhere(req: Request) {
  const u = req.user!;
  if (u.role === "ADMIN" || u.role === "MANAGER") return {};
  if (u.leadScope === "OWN") return { ownerId: u.id };
  return {};
}
