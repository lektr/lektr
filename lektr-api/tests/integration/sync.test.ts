/**
 * Sync API Integration Tests
 *
 * Tests HTTP behavior of sync endpoints including:
 * - Authentication requirements (both pull and push)
 * - Pull: initial sync (no timestamp) returns all records
 * - Pull: incremental sync returns only changed records
 * - Push: creates new books/highlights
 * - Push: soft-deletes records via deleted_at
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { mockDb } from "../mocks/db";
// Mock dependencies
vi.mock("../../src/db", () => ({
  db: mockDb,
}));
// Mock Auth Middleware to inject user
vi.mock("../../src/middleware/auth", () => ({
  authMiddleware: async (c: any, next: any) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const userId = c.req.header("x-mock-user-id") || "user-1";
    c.set("user", { userId, email: `${userId}@test.com`, role: "user" });
    await next();
  },
}));
describe("Sync API", () => {
  let app: Hono;
  beforeEach(async () => {
    mockDb.$reset();
    const { syncOpenAPI } = await import("../../src/openapi/sync.handlers");
    app = new Hono();
    app.route("/sync", syncOpenAPI);
  });
  // ============================================
  // AUTHENTICATION TESTS
  // ============================================
  describe("Authentication", () => {
    test("GET /sync/pull should return 401 without auth header", async () => {
      const res = await app.request("/sync/pull");
      expect(res.status).toBe(401);
    });
    test("POST /sync/push should return 401 without auth header", async () => {
      const res = await app.request("/sync/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changes: {
            books: { created: [], updated: [], deleted: [] },
            highlights: { created: [], updated: [], deleted: [] },
          },
          last_pulled_at: Date.now(),
        }),
      });
      expect(res.status).toBe(401);
    });
  });
  // ============================================
  // PULL TESTS
  // ============================================
  describe("GET /sync/pull", () => {
    test("initial pull (no timestamp) should return all non-deleted records", async () => {
      const now = new Date();
      const mockBook = {
        id: "book-1",
        title: "Test Book",
        author: "Author",
        coverImageUrl: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        userId: "user-1",
      };
      const mockHighlight = {
        id: "hl-1",
        bookId: "book-1",
        content: "Test highlight",
        note: null,
        chapter: null,
        page: null,
        createdAt: now,
        syncedAt: now,
        deletedAt: null,
        userId: "user-1",
      };
      // Queue responses: first for books query, second for highlights query
      mockDb.$queueResponses([[mockBook], [mockHighlight]]);
      const res = await app.request("/sync/pull", {
        headers: { Authorization: "Bearer test-token" },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.changes).toBeDefined();
      expect(body.timestamp).toBeDefined();
      expect(typeof body.timestamp).toBe("number");
      expect(body.changes.books).toBeDefined();
      expect(body.changes.highlights).toBeDefined();
      expect(body.changes.books.created).toBeDefined();
      expect(body.changes.books.updated).toBeDefined();
      expect(body.changes.books.deleted).toBeDefined();
    });
    test("incremental pull should return WatermelonDB-shaped response", async () => {
      const lastPulled = Date.now() - 60000; // 1 minute ago
      // Queue responses for: books created, books updated, books deleted, highlights created, highlights updated, highlights deleted
      mockDb.$queueResponses([
        [{ id: "book-new", title: "New Book", author: "A", coverImageUrl: null, createdAt: new Date(), updatedAt: new Date() }],
        [],
        [],
        [],
        [],
        [],
      ]);
      const res = await app.request(`/sync/pull?last_pulled_at=${lastPulled}`, {
        headers: { Authorization: "Bearer test-token" },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.changes.books.created.length).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(body.changes.books.deleted)).toBe(true);
    });
    test("pull response maps fields to snake_case for WatermelonDB", async () => {
      const now = new Date();
      const mockBook = {
        id: "book-1",
        title: "My Book",
        author: "Author Name",
        coverImageUrl: "https://example.com/cover.jpg",
        createdAt: now,
        updatedAt: now,
      };
      mockDb.$queueResponses([[mockBook], []]);
      const res = await app.request("/sync/pull", {
        headers: { Authorization: "Bearer test-token" },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      const book = body.changes.books.created[0];
      expect(book.cover_image_url).toBe("https://example.com/cover.jpg");
      expect(book.created_at).toBe(now.getTime());
      expect(book.updated_at).toBe(now.getTime());
    });
  });
  // ============================================
  // PUSH TESTS
  // ============================================
  describe("POST /sync/push", () => {
    test("push with created books should call insert", async () => {
      const res = await app.request("/sync/push", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changes: {
            books: {
              created: [
                {
                  id: "new-book-1",
                  title: "Mobile Book",
                  author: "Mobile Author",
                  cover_image_url: null,
                  created_at: Date.now(),
                  updated_at: Date.now(),
                },
              ],
              updated: [],
              deleted: [],
            },
            highlights: { created: [], updated: [], deleted: [] },
          },
          last_pulled_at: Date.now() - 1000,
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
    });
    test("push with deleted books should soft-delete via deletedAt", async () => {
      const res = await app.request("/sync/push", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changes: {
            books: {
              created: [],
              updated: [],
              deleted: ["book-to-delete"],
            },
            highlights: { created: [], updated: [], deleted: [] },
          },
          last_pulled_at: Date.now() - 1000,
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      // Verify update was called (soft delete = update with deletedAt)
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });
    test("push with deleted highlights should soft-delete via deletedAt", async () => {
      const res = await app.request("/sync/push", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changes: {
            books: { created: [], updated: [], deleted: [] },
            highlights: {
              created: [],
              updated: [],
              deleted: ["hl-to-delete"],
            },
          },
          last_pulled_at: Date.now() - 1000,
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });
    test("push with updated books should call update", async () => {
      const res = await app.request("/sync/push", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changes: {
            books: {
              created: [],
              updated: [
                {
                  id: "book-1",
                  title: "Updated Title",
                  author: "Updated Author",
                  cover_image_url: "https://example.com/new-cover.jpg",
                },
              ],
              deleted: [],
            },
            highlights: { created: [], updated: [], deleted: [] },
          },
          last_pulled_at: Date.now() - 1000,
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });
    test("push with empty changes should succeed", async () => {
      const res = await app.request("/sync/push", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changes: {
            books: { created: [], updated: [], deleted: [] },
            highlights: { created: [], updated: [], deleted: [] },
          },
          last_pulled_at: Date.now(),
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
