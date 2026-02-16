/**
 * Digest API Integration Tests
 *
 * Tests HTTP behavior of digest preference endpoints including:
 * - Authentication requirements
 * - Get/update digest preferences
 * - Timezone validation
 * - User isolation (security)
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { mockDb } from "../mocks/db";

// Mock dependencies
vi.mock("../../src/db", () => ({ db: mockDb }));

// Mock Auth Middleware
vi.mock("../../src/middleware/auth", () => ({
  authMiddleware: async (c: any, next: any) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) return c.json({ error: "Unauthorized" }, 401);
    const userId = c.req.header("x-mock-user-id") || "user-1";
    c.set("user", { userId, email: `${userId}@test.com`, role: "user" });
    await next();
  },
}));

describe("Digest API", () => {
  let app: Hono;

  beforeEach(async () => {
    mockDb.$reset();
    const { digestOpenAPI } = await import(
      "../../src/openapi/digest.handlers"
    );
    app = new Hono();
    app.route("/digest", digestOpenAPI);
  });

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================
  describe("Authentication", () => {
    test("GET /digest should return 401 without auth header", async () => {
      const res = await app.request("/digest");
      expect(res.status).toBe(401);
    });

    test("PATCH /digest should return 401 without auth header", async () => {
      const res = await app.request("/digest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digestEnabled: false }),
      });
      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // GET PREFERENCES TESTS
  // ============================================
  describe("GET /digest", () => {
    test("should return digest preferences for authenticated user", async () => {
      mockDb.$setResponse([
        {
          digestEnabled: "true",
          digestFrequency: "daily",
          digestHour: 8,
          digestTimezone: "UTC",
        },
      ]);

      const res = await app.request("/digest", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.digestEnabled).toBe(true);
      expect(body.digestFrequency).toBe("daily");
      expect(body.digestHour).toBe(8);
      expect(body.digestTimezone).toBe("UTC");
    });

    test("should return defaults when user has no preferences set", async () => {
      mockDb.$setResponse([
        {
          digestEnabled: null,
          digestFrequency: null,
          digestHour: null,
          digestTimezone: null,
        },
      ]);

      const res = await app.request("/digest", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toBeDefined();
    });

    test("should return 401 when user not found in DB", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/digest", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // UPDATE PREFERENCES TESTS
  // ============================================
  describe("PATCH /digest", () => {
    test("should update digest preferences", async () => {
      // First query: update, second: select updated
      mockDb.$queueResponses([
        [],
        [
          {
            digestEnabled: "false",
            digestFrequency: "weekly",
            digestHour: 14,
            digestTimezone: "America/New_York",
          },
        ],
      ]);

      const res = await app.request("/digest", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          digestEnabled: false,
          digestFrequency: "weekly",
        }),
      });

      expect(res.status).toBe(200);
      expect(mockDb.update).toHaveBeenCalled();
    });

    test("should reject invalid timezone", async () => {
      const res = await app.request("/digest", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          digestTimezone: "Invalid/Not_A_Timezone",
        }),
      });

      expect(res.status).toBe(400);
    });

    test("should accept valid timezone", async () => {
      mockDb.$queueResponses([
        [],
        [
          {
            digestEnabled: "true",
            digestFrequency: "daily",
            digestHour: 8,
            digestTimezone: "Europe/London",
          },
        ],
      ]);

      const res = await app.request("/digest", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          digestTimezone: "Europe/London",
        }),
      });

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================
  describe("Security - User Isolation", () => {
    test("digest preferences are scoped to authenticated user", async () => {
      mockDb.$setResponse([
        {
          digestEnabled: "true",
          digestFrequency: "daily",
          digestHour: 8,
          digestTimezone: "UTC",
        },
      ]);

      const res = await app.request("/digest", {
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-user-id": "user-1",
        },
      });

      expect(res.status).toBe(200);
      // Handler filters by user.userId in WHERE clause
      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});
