import jwt from "jsonwebtoken";
import { env } from "../env.js";
import type { AuthUser } from "../types.js";

export function signToken(user: AuthUser) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role, leadScope: user.leadScope },
    env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}

export function verifyToken(token: string): AuthUser {
  const decoded = jwt.verify(token, env.JWT_SECRET) as any;
  return {
    id: decoded.sub,
    email: decoded.email,
    name: decoded.name,
    role: decoded.role,
    leadScope: decoded.leadScope,
  };
}
