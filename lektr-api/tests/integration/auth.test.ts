/**
 * Auth API Integration Tests
 *
 * Tests HTTP behavior of auth endpoints including:
 * - Registration (email validation, password strength, duplicate detection)
 * - Login (credentials validation, token generation)
 * - Me (session validation)
 * - Change password/email (auth required, validation)
 * - Logout
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// Mock authService
const mockAuthService = {
  signUp: vi.fn(),
  signIn: vi.fn(),
  validateSession: vi.fn(),
  changePassword: vi.fn(),
  changeEmail: vi.fn(),
};

// Mock AuthError class
class MockAuthError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = "AuthError";
  }
}

vi.mock("../../src/services/auth.service", () => ({
  authService: mockAuthService,
  AuthError: MockAuthError,
}));

describe("Auth API", () => {
  let app: Hono;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { authOpenAPI } = await import("../../src/openapi/auth.handlers");
    app = new Hono();
    app.route("/auth", authOpenAPI);
  });

  // ============================================
  // REGISTRATION TESTS
  // ============================================
  describe("POST /auth/register", () => {
    test("should register new user with valid credentials", async () => {
      mockAuthService.signUp.mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", role: "user" },
        token: "jwt-token"
      });

      const res = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "secure123" })
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.user.email).toBe("test@example.com");
      // Should set cookie
      expect(res.headers.get("Set-Cookie")).toContain("token=");
    });

    test("should return 400 for duplicate email", async () => {
      mockAuthService.signUp.mockRejectedValue(
        new MockAuthError("Email already exists", "EMAIL_EXISTS")
      );

      const res = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "taken@example.com", password: "secure123" })
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("exists");
    });

    test("should reject invalid email format", async () => {
      const res = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", password: "secure123" })
      });

      // Zod validation should catch this
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test("should reject short password", async () => {
      const res = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "short" })
      });

      // Zod validation should catch this
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ============================================
  // LOGIN TESTS
  // ============================================
  describe("POST /auth/login", () => {
    test("should login with valid credentials", async () => {
      mockAuthService.signIn.mockResolvedValue({
        user: { id: "user-1", email: "test@example.com", role: "user" },
        token: "jwt-token"
      });

      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "correct123" })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(res.headers.get("Set-Cookie")).toContain("token=");
    });

    test("should return 401 for invalid credentials", async () => {
      mockAuthService.signIn.mockRejectedValue(
        new MockAuthError("Invalid email or password", "INVALID_CREDENTIALS")
      );

      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "wrongpass" })
      });

      expect(res.status).toBe(401);
    });

    test("should return 401 for non-existent user", async () => {
      mockAuthService.signIn.mockRejectedValue(
        new MockAuthError("Invalid email or password", "INVALID_CREDENTIALS")
      );

      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nobody@example.com", password: "anypass" })
      });

      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // LOGOUT TESTS
  // ============================================
  describe("POST /auth/logout", () => {
    test("should clear token cookie on logout", async () => {
      const res = await app.request("/auth/logout", {
        method: "POST"
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      // Cookie should be cleared (Max-Age=0)
      expect(res.headers.get("Set-Cookie")).toContain("Max-Age=0");
    });
  });

  // ============================================
  // ME (SESSION) TESTS
  // ============================================
  describe("GET /auth/me", () => {
    test("should return 401 without cookie", async () => {
      const res = await app.request("/auth/me");

      expect(res.status).toBe(401);
    });

    test("should return user info with valid token", async () => {
      mockAuthService.validateSession.mockResolvedValue({
        userId: "user-1",
        email: "test@example.com",
        role: "user"
      });

      const res = await app.request("/auth/me", {
        headers: { Cookie: "token=valid-jwt-token" }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.email).toBe("test@example.com");
    });

    test("should return 401 for invalid token", async () => {
      mockAuthService.validateSession.mockRejectedValue(new Error("Invalid token"));

      const res = await app.request("/auth/me", {
        headers: { Cookie: "token=invalid-token" }
      });

      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // CHANGE PASSWORD TESTS
  // ============================================
  describe("PUT /auth/password", () => {
    test("should return 401 without authentication", async () => {
      const res = await app.request("/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: "old123", newPassword: "new12345" })
      });

      expect(res.status).toBe(401);
    });

    test("should change password with valid credentials", async () => {
      mockAuthService.validateSession.mockResolvedValue({
        userId: "user-1",
        email: "test@example.com",
        role: "user"
      });
      mockAuthService.changePassword.mockResolvedValue(undefined);

      const res = await app.request("/auth/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: "token=valid-token"
        },
        body: JSON.stringify({ currentPassword: "old12345", newPassword: "new12345" })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    test("should return 401 for wrong current password", async () => {
      mockAuthService.validateSession.mockResolvedValue({
        userId: "user-1",
        email: "test@example.com"
      });
      mockAuthService.changePassword.mockRejectedValue(
        new MockAuthError("Invalid password", "INVALID_CREDENTIALS")
      );

      const res = await app.request("/auth/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: "token=valid-token"
        },
        body: JSON.stringify({ currentPassword: "wrong", newPassword: "new12345" })
      });

      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // CHANGE EMAIL TESTS
  // ============================================
  describe("PUT /auth/email", () => {
    test("should return 401 without authentication", async () => {
      const res = await app.request("/auth/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: "new@example.com", password: "pass123" })
      });

      expect(res.status).toBe(401);
    });

    test("should change email with valid credentials", async () => {
      mockAuthService.validateSession.mockResolvedValue({
        userId: "user-1",
        email: "old@example.com",
        role: "user"
      });
      mockAuthService.changeEmail.mockResolvedValue({ email: "new@example.com" });

      const res = await app.request("/auth/email", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: "token=valid-token"
        },
        body: JSON.stringify({ newEmail: "new@example.com", password: "correct" })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.email).toBe("new@example.com");
    });

    test("should return 400 for already-used email", async () => {
      mockAuthService.validateSession.mockResolvedValue({
        userId: "user-1",
        email: "old@example.com"
      });
      mockAuthService.changeEmail.mockRejectedValue(
        new MockAuthError("Email already exists", "EMAIL_EXISTS")
      );

      const res = await app.request("/auth/email", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: "token=valid-token"
        },
        body: JSON.stringify({ newEmail: "taken@example.com", password: "correct" })
      });

      expect(res.status).toBe(400);
    });
  });
});
