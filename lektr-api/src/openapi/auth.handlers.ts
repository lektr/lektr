import { OpenAPIHono } from "@hono/zod-openapi";
import { registerRoute, loginRoute, logoutRoute, meRoute, changePasswordRoute, changeEmailRoute } from "./auth.routes";
import { authService, AuthError } from "../services/auth.service";

const isProduction = process.env.NODE_ENV === "production";

const getCookieOptions = (token: string, maxAge: number) => {
  const base = `token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  return isProduction ? `${base}; Secure` : base;
};

export const authOpenAPI = new OpenAPIHono();

// Register
authOpenAPI.openapi(registerRoute, async (c) => {
  const { email, password } = c.req.valid("json");

  try {
    const { user, token } = await authService.signUp(email, password);
    c.header("Set-Cookie", getCookieOptions(token, 60 * 60 * 24 * 7));
    return c.json({ success: true, user }, 201);
  } catch (error) {
    if (error instanceof AuthError && error.code === "EMAIL_EXISTS") {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});

// Login
authOpenAPI.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid("json");

  try {
    const { user, token } = await authService.signIn(email, password);
    c.header("Set-Cookie", getCookieOptions(token, 60 * 60 * 24 * 7));
    return c.json({ success: true, user }, 200);
  } catch (error) {
    if (error instanceof AuthError && error.code === "INVALID_CREDENTIALS") {
      return c.json({ error: error.message }, 401);
    }
    throw error;
  }
});

// Logout
authOpenAPI.openapi(logoutRoute, (c) => {
  c.header("Set-Cookie", `token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${isProduction ? "; Secure" : ""}`);
  return c.json({ success: true }, 200);
});

// Me
authOpenAPI.openapi(meRoute, async (c) => {
  const cookie = c.req.header("Cookie");
  const token = cookie?.match(/token=([^;]+)/)?.[1];

  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  try {
    const payload = await authService.validateSession(token);
    return c.json({
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      },
    }, 200);
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// Change Password
authOpenAPI.openapi(changePasswordRoute, async (c) => {
  const cookie = c.req.header("Cookie");
  const token = cookie?.match(/token=([^;]+)/)?.[1];

  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  try {
    const payload = await authService.validateSession(token);
    const { currentPassword, newPassword } = c.req.valid("json");

    await authService.changePassword(payload.userId, currentPassword, newPassword);
    return c.json({ success: true }, 200);
  } catch (error) {
    if (error instanceof AuthError && error.code === "INVALID_CREDENTIALS") {
      return c.json({ error: error.message }, 401);
    }
    if (error instanceof AuthError && error.code === "INVALID_TOKEN") {
      return c.json({ error: "Invalid token" }, 401);
    }
    throw error;
  }
});

// Change Email
authOpenAPI.openapi(changeEmailRoute, async (c) => {
  const cookie = c.req.header("Cookie");
  const token = cookie?.match(/token=([^;]+)/)?.[1];

  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  try {
    const payload = await authService.validateSession(token);
    const { newEmail, password } = c.req.valid("json");

    const result = await authService.changeEmail(payload.userId, newEmail, password);
    return c.json({ success: true, email: result.email }, 200);
  } catch (error) {
    if (error instanceof AuthError && error.code === "INVALID_CREDENTIALS") {
      return c.json({ error: error.message }, 401);
    }
    if (error instanceof AuthError && error.code === "EMAIL_EXISTS") {
      return c.json({ error: error.message }, 400);
    }
    if (error instanceof AuthError && error.code === "INVALID_TOKEN") {
      return c.json({ error: "Invalid token" }, 401);
    }
    throw error;
  }
});
