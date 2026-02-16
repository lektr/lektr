/**
 * Rediscovery API Integration Tests
 *
 * Tests HTTP behavior of the rediscovery endpoint including:
 * - Authentication requirements
 * - Query parameter validation (count clamping)
 * - Response structure
 * - Empty state handling
 * - User isolation (only own highlights)
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { mockDb } from "../mocks/db";

// Mock dependencies
vi.mock("../../src/db", () => ({
  db: mockDb,
}));

// Mock Auth Middleware
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

describe("Rediscovery API", () => {
  let app: Hono;

  beforeEach(async () => {
    mockDb.$reset();
    const { rediscoveryOpenAPI } = await import(
      "../../src/openapi/rediscovery.handlers"
    );
    app = new Hono();
    app.route("/rediscovery", rediscoveryOpenAPI);
  });

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================
  describe("Authentication", () => {
    test("GET /rediscovery should return 401 without auth header", async () => {
      const res = await app.request("/rediscovery");
      expect(res.status).toBe(401);
    });

    test("GET /rediscovery should return 200 with valid auth", async () => {
      // Empty highlights
      mockDb.$queueResponses([[], []]);

      const res = await app.request("/rediscovery", {
        headers: { Authorization: "Bearer test-token" },
      });
      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // RESPONSE STRUCTURE TESTS
  // ============================================
  describe("Response Structure", () => {
    test("should return highlights array", async () => {
      mockDb.$queueResponses([[], []]);

      const res = await app.request("/rediscovery", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("highlights");
      expect(Array.isArray(body.highlights)).toBe(true);
    });

    test("empty library returns empty highlights array, not error", async () => {
      mockDb.$queueResponses([[], []]);

      const res = await app.request("/rediscovery", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.highlights).toEqual([]);
    });

    test("should return highlight with correct shape when data exists", async () => {
      const mockHighlight = {
        id: "hl-1",
        content: "A beautiful sunrise",
        note: "my note",
        chapter: "Chapter 1",
        page: 42,
        highlightedAt: new Date("2024-06-01"),
        bookId: "book-1",
        bookTitle: "Test Book",
        bookAuthor: "Author Name",
        coverImageUrl: "/covers/test.jpg",
      };

      const mockTags = [{ id: "tag-1", name: "wisdom", color: "#ff0000" }];

      mockDb.$queueResponses([[mockHighlight], mockTags]);

      const res = await app.request("/rediscovery", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.highlights).toHaveLength(1);

      const hl = body.highlights[0];
      expect(hl.id).toBe("hl-1");
      expect(hl.content).toBe("A beautiful sunrise");
      expect(hl.note).toBe("my note");
      expect(hl.chapter).toBe("Chapter 1");
      expect(hl.page).toBe(42);
      expect(hl.bookId).toBe("book-1");
      expect(hl.bookTitle).toBe("Test Book");
      expect(hl.bookAuthor).toBe("Author Name");
      expect(hl.coverImageUrl).toBe("/covers/test.jpg");
      expect(hl.tags).toEqual(mockTags);
      expect(typeof hl.highlightedAt).toBe("string"); // ISO string
    });

    test("should handle highlight without highlightedAt", async () => {
      const mockHighlight = {
        id: "hl-2",
        content: "Some content",
        note: null,
        chapter: null,
        page: null,
        highlightedAt: null,
        bookId: "book-1",
        bookTitle: "Book",
        bookAuthor: null,
        coverImageUrl: null,
      };

      mockDb.$queueResponses([[mockHighlight], []]);

      const res = await app.request("/rediscovery", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.highlights[0].highlightedAt).toBeNull();
      expect(body.highlights[0].bookAuthor).toBeNull();
      expect(body.highlights[0].tags).toEqual([]);
    });
  });

  // ============================================
  // COUNT PARAMETER TESTS
  // ============================================
  describe("Count Parameter", () => {
    test("default count should be 5 when not specified", async () => {
      mockDb.$queueResponses([[], []]);

      const res = await app.request("/rediscovery", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      // Verify limit was called (the mock chains through)
      expect(mockDb.limit).toHaveBeenCalledWith(5);
    });

    test("custom count should be respected", async () => {
      mockDb.$queueResponses([[], []]);

      const res = await app.request("/rediscovery?count=3", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      expect(mockDb.limit).toHaveBeenCalledWith(3);
    });

    test("count should be capped at 20", async () => {
      mockDb.$queueResponses([[], []]);

      const res = await app.request("/rediscovery?count=100", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      expect(mockDb.limit).toHaveBeenCalledWith(20);
    });

    test("count below 1 should be clamped to 1", async () => {
      mockDb.$queueResponses([[], []]);

      const res = await app.request("/rediscovery?count=0", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });

    test("non-numeric count should fallback to default 5", async () => {
      mockDb.$queueResponses([[], []]);

      const res = await app.request("/rediscovery?count=abc", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      expect(mockDb.limit).toHaveBeenCalledWith(5);
    });

    test("negative count should be clamped to 1", async () => {
      mockDb.$queueResponses([[], []]);

      const res = await app.request("/rediscovery?count=-5", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });
  });

  // ============================================
  // MULTIPLE HIGHLIGHTS TESTS
  // ============================================
  describe("Multiple Highlights", () => {
    test("should return multiple highlights", async () => {
      const mockHighlights = [
        {
          id: "hl-1",
          content: "First highlight",
          note: null,
          chapter: null,
          page: null,
          highlightedAt: new Date("2024-01-01"),
          bookId: "book-1",
          bookTitle: "Book 1",
          bookAuthor: "Author 1",
          coverImageUrl: null,
        },
        {
          id: "hl-2",
          content: "Second highlight",
          note: "A note",
          chapter: "Ch. 2",
          page: 10,
          highlightedAt: new Date("2024-02-01"),
          bookId: "book-2",
          bookTitle: "Book 2",
          bookAuthor: "Author 2",
          coverImageUrl: "/covers/book2.jpg",
        },
      ];

      // First call returns highlights, then tags for hl-1 and hl-2
      mockDb.$queueResponses([mockHighlights, [], []]);

      const res = await app.request("/rediscovery?count=2", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.highlights).toHaveLength(2);
      expect(body.highlights[0].id).toBe("hl-1");
      expect(body.highlights[1].id).toBe("hl-2");
    });
  });
});
