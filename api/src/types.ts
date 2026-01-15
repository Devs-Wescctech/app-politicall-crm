import type { Role, LeadScope } from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  leadScope: LeadScope;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
