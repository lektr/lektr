/**
 * Tags API Integration Tests
 *
 * Tests HTTP behavior of tag endpoints including:
 * - Authentication requirements
 * - Authorization (user isolation)
 * - Response structure
 * - Error handling
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { mockDb } from "../mocks/db";

// Mock dependencies
vi.mock("../../src/db", () => ({
  db: mockDb
}));

// Mock Auth Middleware to inject user
vi.mock("../../src/middleware/auth", () => ({
  authMiddleware: async (c: any, next: any) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = c.req.header("x-mock-user-id") || "user-1";
    // Handlers use user.userId, not user.id
    c.set("user", { userId, email: `${userId}@test.com`, role: "user" });
    await next();
  }
}));

describe("Tags API", () => {
  let app: Hono;

  beforeEach(async () => {
    mockDb.$reset();

    const { tagsOpenAPI } = await import("../../src/openapi/tags.handlers");
    app = new Hono();
    app.route("/tags", tagsOpenAPI);
  });

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================
  describe("Authentication", () => {
    test("GET /tags should return 401 without auth header", async () => {
      const res = await app.request("/tags");
      expect(res.status).toBe(401);
    });

    test("POST /tags should return 401 without auth header", async () => {
      const res = await app.request("/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "test-tag" })
      });
      expect(res.status).toBe(401);
    });

    test("DELETE /tags/:id should return 401 without auth header", async () => {
      const res = await app.request("/tags/some-tag-id", {
        method: "DELETE"
      });
      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // LIST TAGS TESTS
  // ============================================
  describe("GET /tags", () => {
    test("should return empty array when user has no tags", async () => {
      // First query: tags list (returns empty)
      mockDb.$setResponse([]);
      // Two execute() calls for book counts and highlight counts
      mockDb.$setExecuteResponse([], []);

      const res = await app.request("/tags", {
        headers: { Authorization: "Bearer test-token" }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.tags).toEqual([]);
    });

    test("should return tags with correct structure", async () => {
      const mockTag = {
        id: "tag-1",
        name: "productivity",
        color: "#3b82f6",
        userId: "user-1",
        createdAt: new Date("2024-01-01")
      };
      // First query: tags list
      mockDb.$setResponse([mockTag]);
      // Two execute() calls for book counts and highlight counts
      mockDb.$setExecuteResponse(
        [{ tag_id: "tag-1", count: 2 }],  // book counts
        [{ tag_id: "tag-1", count: 5 }]   // highlight counts
      );

      const res = await app.request("/tags", {
        headers: { Authorization: "Bearer test-token" }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.tags).toBeDefined();
      expect(Array.isArray(body.tags)).toBe(true);
    });
  });

  // ============================================
  // CREATE TAG TESTS
  // ============================================
  describe("POST /tags", () => {
    test("should create tag with valid data", async () => {
      // Mock: duplicate check returns empty, insert returns new tag
      const newTag = {
        id: "tag-new",
        name: "new-tag",
        color: "#3b82f6",
        userId: "user-1",
        createdAt: new Date("2024-01-01")
      };
      // Queue responses: 1st query (duplicate check), 2nd query (insert returning)
      mockDb.$queueResponses([[], [newTag]]);

      const res = await app.request("/tags", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: "new-tag", color: "#3b82f6" })
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.tag).toBeDefined();
      expect(body.tag.name).toBe("new-tag");
    });

    test("should reject empty tag name", async () => {
      const res = await app.request("/tags", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: "" })
      });

      // Should return 400 or validation error
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ============================================
  // GET TAG DETAIL TESTS
  // ============================================
  describe("GET /tags/:id", () => {
    test("should return 404 for non-existent tag", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/tags/non-existent-id", {
        headers: { Authorization: "Bearer test-token" }
      });

      expect(res.status).toBe(404);
    });

    test("should return 404 for another user's tag", async () => {
      // Since handler uses WHERE (tags.id = X AND tags.userId = user.userId),
      // an empty result means no tag found with that ID for this user
      mockDb.$setResponse([]);

      const res = await app.request("/tags/tag-1", {
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-user-id": "user-1"
        }
      });

      expect(res.status).toBe(404);
    });
  });

  // ============================================
  // DELETE TAG TESTS
  // ============================================
  describe("DELETE /tags/:id", () => {
    test("should return 404 for non-existent tag", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/tags/non-existent-id", {
        method: "DELETE",
        headers: { Authorization: "Bearer test-token" }
      });

      expect(res.status).toBe(404);
    });

    test("should return 404 when deleting another user's tag", async () => {
      // Since handler uses WHERE (tags.id = X AND tags.userId = user.userId),
      // an empty result means no tag found with that ID for this user
      mockDb.$setResponse([]);

      const res = await app.request("/tags/tag-1", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-user-id": "user-1"
        }
      });

      expect(res.status).toBe(404);
    });

    test("should delete own tag successfully", async () => {
      const userTag = {
        id: "tag-1",
        name: "my-tag",
        userId: "user-1"
      };
      mockDb.$setResponse([userTag]);

      const res = await app.request("/tags/tag-1", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-user-id": "user-1"
        }
      });

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // TAG ASSOCIATION TESTS
  // ============================================
  describe("POST /tags/:id/highlights/:highlightId", () => {
    test("should return 401 without auth header", async () => {
      const res = await app.request("/tags/tag-1/highlights/h-1", {
        method: "POST"
      });
      expect(res.status).toBe(401);
    });

    test("should return 404 for non-existent tag", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/tags/non-existent/highlights/h-1", {
        method: "POST",
        headers: { Authorization: "Bearer test-token" }
      });

      expect(res.status).toBe(404);
    });
  });
});
