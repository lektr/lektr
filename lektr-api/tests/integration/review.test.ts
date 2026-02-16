/**
 * Review API Integration Tests
 *
 * Tests HTTP behavior of spaced repetition review endpoints including:
 * - Authentication requirements
 * - Review queue retrieval
 * - Review submission with FSRS scheduling
 * - Review statistics
 * - Security: IDOR prevention, user isolation
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { mockDb } from "../mocks/db";

// Mock dependencies
vi.mock("../../src/db", () => ({ db: mockDb }));

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

describe("Review API", () => {
  let app: Hono;

  beforeEach(async () => {
    mockDb.$reset();

    const { reviewOpenAPI } = await import("../../src/openapi/review.handlers");
    app = new Hono();
    app.route("/review", reviewOpenAPI);
  });

  // ============================================
  // AUTHENTICATION
  // ============================================
  describe("Authentication", () => {
    test("GET /review should return 401 without auth", async () => {
      const res = await app.request("/review");
      expect(res.status).toBe(401);
    });

    test("POST /review/:id should return 401 without auth", async () => {
      const res = await app.request("/review/highlight-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: "good" }),
      });
      expect(res.status).toBe(401);
    });

    test("GET /review/stats should return 401 without auth", async () => {
      const res = await app.request("/review/stats");
      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // REVIEW QUEUE
  // ============================================
  describe("GET /review", () => {
    test("should return review queue", async () => {
      // Due highlights, new highlights, total due count
      mockDb.$queueExecuteResponses([
        { rows: [{ id: "h-1", content: "Test", note: null, chapter: "Ch 1", page: 5, book_id: "b-1", book_title: "Book", book_author: "Author", fsrs_card: null }] },
        { rows: [] },
        [{ count: 1 }],
      ]);

      const res = await app.request("/review", {
        headers: { Authorization: "Bearer token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.items).toBeDefined();
      expect(Array.isArray(body.items)).toBe(true);
      expect(body).toHaveProperty("total");
      expect(body).toHaveProperty("dueCount");
    });

    test("should return empty queue when no highlights", async () => {
      mockDb.$queueExecuteResponses([
        { rows: [] },
        { rows: [] },
        [{ count: 0 }],
      ]);

      const res = await app.request("/review", {
        headers: { Authorization: "Bearer token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.items).toEqual([]);
      expect(body.total).toBe(0);
    });
  });

  // ============================================
  // SUBMIT REVIEW
  // ============================================
  describe("POST /review/:id", () => {
    test("should return 404 for non-existent highlight", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/review/non-existent", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating: "good" }),
      });

      expect(res.status).toBe(404);
    });

    test("should return 403 for another user's highlight", async () => {
      mockDb.$setResponse([{
        id: "h-1",
        userId: "user-2",
        content: "Someone else's highlight",
        fsrsCard: null,
      }]);

      const res = await app.request("/review/h-1", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "x-mock-user-id": "user-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating: "good" }),
      });

      expect(res.status).toBe(403);
    });

    test("should submit rating for own highlight", async () => {
      mockDb.$setResponse([{
        id: "h-1",
        userId: "user-1",
        content: "My highlight",
        fsrsCard: null,
      }]);

      const res = await app.request("/review/h-1", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "x-mock-user-id": "user-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating: "good" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.nextReview).toBeDefined();
      expect(body.interval).toBeDefined();
      expect(body.state).toBeDefined();
    });

    test("should handle 'again' rating", async () => {
      mockDb.$setResponse([{
        id: "h-1",
        userId: "user-1",
        content: "Difficult highlight",
        fsrsCard: null,
      }]);

      const res = await app.request("/review/h-1", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "x-mock-user-id": "user-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating: "again" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  // ============================================
  // REVIEW STATS
  // ============================================
  describe("GET /review/stats", () => {
    test("should return review statistics", async () => {
      mockDb.$setExecuteResponse({
        rows: [{
          new_count: "10",
          due_count: "5",
          learning_count: "3",
          review_count: "20",
          total_count: "38",
        }],
      });

      const res = await app.request("/review/stats", {
        headers: { Authorization: "Bearer token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.new).toBe(10);
      expect(body.due).toBe(5);
      expect(body.learning).toBe(3);
      expect(body.review).toBe(20);
      expect(body.total).toBe(38);
    });

    test("should return zeros when no highlights", async () => {
      mockDb.$setExecuteResponse({ rows: [{}] });

      const res = await app.request("/review/stats", {
        headers: { Authorization: "Bearer token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.new).toBe(0);
      expect(body.due).toBe(0);
      expect(body.total).toBe(0);
    });
  });

  // ============================================
  // SECURITY
  // ============================================
  describe("Security", () => {
    test("cannot review another user's highlight (IDOR)", async () => {
      mockDb.$setResponse([{
        id: "h-other",
        userId: "user-2",
        content: "Other user's highlight",
        fsrsCard: null,
      }]);

      const res = await app.request("/review/h-other", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "x-mock-user-id": "user-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating: "easy" }),
      });

      expect(res.status).toBe(403);
    });
  });
});
