import { createMiddleware } from "hono/factory";
import { authService } from "../services/auth.service";

export interface AuthUser {
  userId: string;
  email: string;
  role: "user" | "admin";
}

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

/**
 * Auth middleware - validates JWT token and sets user in context.
 * Use this on protected routes.
 */
export const authMiddleware = createMiddleware(async (c, next) => {
  const cookie = c.req.header("Cookie");
  const token = cookie?.match(/token=([^;]+)/)?.[1];

  if (!token) {
    return c.json({ error: "Authentication required" }, 401);
  }

  try {
    const payload = await authService.validateSession(token);
    c.set("user", {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});
