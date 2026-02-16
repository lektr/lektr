/**
 * Auth Middleware Unit Tests
 *
 * Tests the REAL authMiddleware with real JWT operations.
 * Uses the dev secret to sign/verify tokens via jose.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import * as jose from "jose";

// Mock the auth service's validateSession (which is called by authMiddleware)
const mockValidateSession = vi.fn();

vi.mock("../../src/services/auth.service", () => ({
  authService: {
    validateSession: (...args: any[]) => mockValidateSession(...args),
  },
  AuthError: class extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

// Import the REAL middleware (not mocked)
import { authMiddleware } from "../../src/middleware/auth";

describe("Auth Middleware", () => {
  let app: Hono;

  const DEV_SECRET = "lektr-dev-secret-change-in-production";
  const secret = new TextEncoder().encode(DEV_SECRET);

  async function signToken(payload: Record<string, unknown>, expiresIn = "7d") {
    return new jose.SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secret);
  }

  beforeEach(() => {
    mockValidateSession.mockReset();

    app = new Hono();
    app.use("/*", authMiddleware);
    app.get("/test", (c) => {
      const user = c.get("user");
      return c.json({ user });
    });
  });

  // ============================================
  // NO TOKEN
  // ============================================
  test("should return 401 when no token is provided", async () => {
    const res = await app.request("/test");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  // ============================================
  // INVALID TOKEN
  // ============================================
  test("should return 401 for invalid JWT", async () => {
    mockValidateSession.mockRejectedValue(new Error("Invalid token"));

    const res = await app.request("/test", {
      headers: { Authorization: "Bearer invalid-jwt-token" },
    });

    expect(res.status).toBe(401);
  });

  // ============================================
  // EXPIRED TOKEN
  // ============================================
  test("should return 401 for expired JWT", async () => {
    mockValidateSession.mockRejectedValue(new Error("Token expired"));

    const res = await app.request("/test", {
      headers: { Authorization: "Bearer expired-token" },
    });

    expect(res.status).toBe(401);
  });

  // ============================================
  // VALID BEARER TOKEN
  // ============================================
  test("should set user context for valid Bearer token", async () => {
    const token = await signToken({
      userId: "user-123",
      email: "test@test.com",
      role: "user",
    });

    mockValidateSession.mockResolvedValue({
      userId: "user-123",
      email: "test@test.com",
      role: "user",
    });

    const res = await app.request("/test", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.userId).toBe("user-123");
    expect(body.user.email).toBe("test@test.com");
    expect(body.user.role).toBe("user");
  });

  // ============================================
  // COOKIE TOKEN
  // ============================================
  test("should accept token from cookie", async () => {
    const token = await signToken({
      userId: "user-456",
      email: "cookie@test.com",
      role: "user",
    });

    mockValidateSession.mockResolvedValue({
      userId: "user-456",
      email: "cookie@test.com",
      role: "user",
    });

    const res = await app.request("/test", {
      headers: { Cookie: `token=${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.userId).toBe("user-456");
  });

  // ============================================
  // ADMIN ROLE
  // ============================================
  test("should parse admin role correctly", async () => {
    const token = await signToken({
      userId: "admin-1",
      email: "admin@test.com",
      role: "admin",
    });

    mockValidateSession.mockResolvedValue({
      userId: "admin-1",
      email: "admin@test.com",
      role: "admin",
    });

    const res = await app.request("/test", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.role).toBe("admin");
  });

  // ============================================
  // BEARER PREFERENCE
  // ============================================
  test("should prefer Bearer token over cookie", async () => {
    const bearerToken = "bearer-token";
    const cookieToken = "cookie-token";

    mockValidateSession.mockResolvedValue({
      userId: "bearer-user",
      email: "bearer@test.com",
      role: "user",
    });

    const res = await app.request("/test", {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Cookie: `token=${cookieToken}`,
      },
    });

    expect(res.status).toBe(200);
    // validateSession should be called with the Bearer token, not cookie
    expect(mockValidateSession).toHaveBeenCalledWith(bearerToken);
  });
});
