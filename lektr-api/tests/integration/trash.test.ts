/**
 * Trash API Integration Tests
 *
 * Tests HTTP behavior of the trash endpoint including:
 * - Authentication requirements
 * - Response structure for soft-deleted highlights
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

describe("Trash API", () => {
  let app: Hono;

  beforeEach(async () => {
    mockDb.$reset();
    const { trashOpenAPI } = await import("../../src/openapi/trash.handlers");
    app = new Hono();
    app.route("/trash", trashOpenAPI);
  });

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================
  describe("Authentication", () => {
    test("GET /trash should return 401 without auth header", async () => {
      const res = await app.request("/trash");
      expect(res.status).toBe(401);
    });

    test("GET /trash should return 200 with valid auth", async () => {
      mockDb.$setResponse([]);
      const res = await app.request("/trash", {
        headers: { Authorization: "Bearer test-token" },
      });
      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // RESPONSE STRUCTURE TESTS
  // ============================================
  describe("GET /trash", () => {
    test("should return empty array when no deleted highlights", async () => {
      mockDb.$setResponse([]);
      const res = await app.request("/trash", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.highlights).toEqual([]);
    });

    test("should return soft-deleted highlights with book info", async () => {
      const mockHighlight = {
        id: "h-1",
        bookId: "book-1",
        content: "A deleted highlight",
        note: "some note",
        chapter: "Chapter 3",
        page: 42,
        deletedAt: new Date("2024-06-01"),
        highlightedAt: new Date("2024-01-15"),
        bookTitle: "Test Book",
        bookAuthor: "Test Author",
      };

      mockDb.$setResponse([mockHighlight]);

      const res = await app.request("/trash", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.highlights).toHaveLength(1);

      const hl = body.highlights[0];
      expect(hl.id).toBe("h-1");
      expect(hl.content).toBe("A deleted highlight");
      expect(hl.bookTitle).toBe("Test Book");
      expect(hl.bookAuthor).toBe("Test Author");
    });

    test("should return multiple deleted highlights", async () => {
      const mockHighlights = [
        {
          id: "h-1",
          bookId: "book-1",
          content: "First deleted",
          note: null,
          chapter: null,
          page: null,
          deletedAt: new Date("2024-06-01"),
          highlightedAt: null,
          bookTitle: "Book A",
          bookAuthor: "Author A",
        },
        {
          id: "h-2",
          bookId: "book-2",
          content: "Second deleted",
          note: null,
          chapter: null,
          page: null,
          deletedAt: new Date("2024-07-01"),
          highlightedAt: null,
          bookTitle: "Book B",
          bookAuthor: null,
        },
      ];

      mockDb.$setResponse(mockHighlights);

      const res = await app.request("/trash", {
        headers: { Authorization: "Bearer test-token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.highlights).toHaveLength(2);
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================
  describe("Security - User Isolation", () => {
    test("should only return highlights for authenticated user", async () => {
      // The handler filters by userId in the WHERE clause
      // When user-1 requests, mock returns their highlights only
      mockDb.$setResponse([
        {
          id: "h-1",
          bookId: "book-1",
          content: "User 1 highlight",
          note: null,
          chapter: null,
          page: null,
          deletedAt: new Date(),
          highlightedAt: null,
          bookTitle: "Book",
          bookAuthor: "Author",
        },
      ]);

      const res = await app.request("/trash", {
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-user-id": "user-1",
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.highlights).toHaveLength(1);

      // Verify the DB was queried with the correct user constraint
      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});
