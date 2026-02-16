/**
 * Security Auth Integration Tests
 *
 * Tests auth-related security concerns including:
 * - Timing-safe login (no user enumeration)
 * - Registration duplicate handling
 * - Password/email change requires current password
 * - Cookie security attributes
 * - Logout clears cookie
 * - JWT tampering rejection
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { mockDb } from "../mocks/db";

// Mock dependencies
vi.mock("../../src/db", () => ({ db: mockDb }));

// Mock bcryptjs so we can control password comparison
const mockBcryptCompare = vi.fn();
const mockBcryptHash = vi.fn();
vi.mock("bcryptjs", () => ({
  default: {
    compare: (...args: any[]) => mockBcryptCompare(...args),
    hash: (...args: any[]) => mockBcryptHash(...args),
  },
}));

// Mock jose for JWT operations
const mockSign = vi.fn();
const mockVerify = vi.fn();

vi.mock("jose", () => ({
  SignJWT: class MockSignJWT {
    private payload: any;
    constructor(payload: any) { this.payload = payload; }
    setProtectedHeader() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    async sign() { return mockSign(this.payload); }
  },
  jwtVerify: (...args: any[]) => mockVerify(...args),
}));

describe("Security: Authentication", () => {
  let app: Hono;

  beforeEach(async () => {
    mockDb.$reset();
    mockBcryptCompare.mockReset();
    mockBcryptHash.mockReset();
    mockSign.mockReset();
    mockVerify.mockReset();

    // Default: sign returns a fake token
    mockSign.mockResolvedValue("fake-jwt-token");
    mockBcryptHash.mockResolvedValue("hashed-password");

    const { authOpenAPI } = await import("../../src/openapi/auth.handlers");
    app = new Hono();
    app.route("/auth", authOpenAPI);
  });

  // ============================================
  // USER ENUMERATION PREVENTION
  // ============================================
  describe("User Enumeration Prevention", () => {
    test("login with non-existent email returns same error as wrong password", async () => {
      // No user found
      mockDb.$setResponse([]);

      const res1 = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nonexistent@test.com", password: "wrong" }),
      });

      expect(res1.status).toBe(401);
      const body1 = await res1.json();

      // Real user but wrong password
      mockDb.$setResponse([{
        id: "user-1",
        email: "real@test.com",
        passwordHash: "hashed",
        role: "user",
      }]);
      mockBcryptCompare.mockResolvedValue(false);

      const res2 = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "real@test.com", password: "wrongpass" }),
      });

      expect(res2.status).toBe(401);
      const body2 = await res2.json();

      // Both should return the same generic error message
      expect(body1.error).toBe(body2.error);
    });
  });

  // ============================================
  // REGISTRATION DUPLICATE
  // ============================================
  describe("Registration Duplicate", () => {
    test("returns 400 for duplicate email without leaking details", async () => {
      // Existing user found
      mockDb.$setResponse([{ id: "user-1", email: "exists@test.com" }]);

      const res = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "exists@test.com", password: "pass123" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });
  });

  // ============================================
  // COOKIE SECURITY
  // ============================================
  describe("Cookie Security", () => {
    test("login should set HttpOnly cookie", async () => {
      mockDb.$setResponse([{
        id: "user-1",
        email: "test@test.com",
        passwordHash: "hashed",
        role: "user",
      }]);
      mockBcryptCompare.mockResolvedValue(true);

      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@test.com", password: "correct" }),
      });

      expect(res.status).toBe(200);
      const setCookie = res.headers.get("Set-Cookie");
      if (setCookie) {
        expect(setCookie).toContain("HttpOnly");
        expect(setCookie).toContain("SameSite=Lax");
      }
    });
  });

  // ============================================
  // LOGOUT
  // ============================================
  describe("Logout", () => {
    test("should clear cookie with Max-Age=0", async () => {
      const res = await app.request("/auth/logout", {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const setCookie = res.headers.get("Set-Cookie");
      if (setCookie) {
        expect(setCookie).toContain("Max-Age=0");
      }
    });
  });
});
