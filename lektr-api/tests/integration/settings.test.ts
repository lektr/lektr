/**
 * Settings API Integration Tests
 *
 * Tests HTTP behavior of settings endpoints including:
 * - Public GET (no auth required)
 * - Admin-only PATCH (role-based access control)
 * - Input validation
 * - Check-reduction endpoint
 * - Security: privilege escalation prevention
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { mockDb } from "../mocks/db";

// Mock dependencies
vi.mock("../../src/db", () => ({ db: mockDb }));

// Mock Auth Middleware with role support
vi.mock("../../src/middleware/auth", () => ({
  authMiddleware: async (c: any, next: any) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) return c.json({ error: "Unauthorized" }, 401);
    const userId = c.req.header("x-mock-user-id") || "user-1";
    const role = c.req.header("x-mock-role") || "user";
    c.set("user", { userId, email: `${userId}@test.com`, role });
    await next();
  },
}));

describe("Settings API", () => {
  let app: Hono;

  beforeEach(async () => {
    mockDb.$reset();
    const { settingsOpenAPI } = await import(
      "../../src/openapi/settings.handlers"
    );
    app = new Hono();
    app.route("/settings", settingsOpenAPI);
  });

  // ============================================
  // PUBLIC GET TESTS
  // ============================================
  describe("GET /settings", () => {
    test("should return settings without auth (public endpoint)", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/settings");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.settings).toBeDefined();
      // Should include defaults
      expect(body.settings.max_highlight_length).toBeDefined();
      expect(body.settings.max_highlight_length.value).toBe("5000");
    });

    test("should merge DB settings with defaults", async () => {
      mockDb.$setResponse([
        { key: "theme_default", value: "dark", description: "Theme preference" },
      ]);

      const res = await app.request("/settings");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.settings.theme_default.value).toBe("dark");
      // Other defaults should still be present
      expect(body.settings.max_highlight_length.value).toBe("5000");
    });
  });

  // ============================================
  // PROTECTED PATCH TESTS
  // ============================================
  describe("PATCH /settings", () => {
    test("should return 401 without auth", async () => {
      const res = await app.request("/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { theme_default: "dark" } }),
      });
      expect(res.status).toBe(401);
    });

    test("should return 403 for non-admin user", async () => {
      const res = await app.request("/settings", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-role": "user",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: { theme_default: "dark" } }),
      });
      expect(res.status).toBe(403);
    });

    test("should update settings as admin", async () => {
      const res = await app.request("/settings", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-role": "admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: { theme_default: "dark" } }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    test("should reject invalid theme_default value", async () => {
      const res = await app.request("/settings", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-role": "admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: { theme_default: "purple" } }),
      });
      expect(res.status).toBe(400);
    });

    test("should reject numeric setting below 100", async () => {
      const res = await app.request("/settings", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-role": "admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: { max_highlight_length: "50" } }),
      });
      expect(res.status).toBe(400);
    });

    test("should reject non-numeric value for numeric setting", async () => {
      const res = await app.request("/settings", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-role": "admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: { max_highlight_length: "abc" } }),
      });
      expect(res.status).toBe(400);
    });

    test("should reject invalid telemetry_enabled value", async () => {
      const res = await app.request("/settings", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-role": "admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: { telemetry_enabled: "yes" } }),
      });
      expect(res.status).toBe(400);
    });

    test("should accept valid telemetry_enabled values", async () => {
      const res = await app.request("/settings", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-role": "admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: { telemetry_enabled: "false" } }),
      });
      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // CHECK-REDUCTION TESTS
  // ============================================
  describe("GET /settings/check-reduction", () => {
    test("should return 401 without auth", async () => {
      const res = await app.request("/settings/check-reduction?limit=500");
      expect(res.status).toBe(401);
    });

    test("should return 400 for limit below 100", async () => {
      const res = await app.request("/settings/check-reduction?limit=50", {
        headers: { Authorization: "Bearer test-token" },
      });
      expect(res.status).toBe(400);
    });

    test("should return affected count for valid limit", async () => {
      mockDb.$setResponse([{ count: 3 }]);

      const res = await app.request("/settings/check-reduction?limit=500", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.affectedCount).toBe(3);
      expect(body.newLimit).toBe(500);
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================
  describe("Security", () => {
    test("non-admin cannot bypass role check via request body", async () => {
      const res = await app.request("/settings", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-role": "user",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: { theme_default: "dark" },
          role: "admin", // Attempting to escalate
        }),
      });
      expect(res.status).toBe(403);
    });

    test("admin can update multiple settings at once", async () => {
      const res = await app.request("/settings", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-role": "admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: {
            theme_default: "dark",
            max_highlight_length: "3000",
            telemetry_enabled: "false",
          },
        }),
      });

      expect(res.status).toBe(200);
      // Should have called insert for each setting
      expect(mockDb.insert).toHaveBeenCalledTimes(3);
    });
  });
});
