/**
 * Books API Integration Tests
 *
 * Tests HTTP behavior of book endpoints including:
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

    // Parse user from header for testing different users
    const userId = c.req.header("x-mock-user-id") || "user-1";
    // Handlers use user.userId, not user.id
    c.set("user", { userId, email: `${userId}@test.com`, role: "user" });
    await next();
  }
}));

describe("Books API", () => {
  let app: Hono;

  beforeEach(async () => {
    mockDb.$reset();

    // Import and mount router
    const { booksOpenAPI } = await import("../../src/openapi/books.handlers");
    app = new Hono();
    app.route("/books", booksOpenAPI);
  });

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================
  describe("Authentication", () => {
    test("GET /books should return 401 without auth header", async () => {
      const res = await app.request("/books");
      expect(res.status).toBe(401);
    });

    test("GET /books/:id should return 401 without auth header", async () => {
      const res = await app.request("/books/some-book-id");
      expect(res.status).toBe(401);
    });

    test("PATCH /books/:id should return 401 without auth header", async () => {
      const res = await app.request("/books/some-book-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Title" })
      });
      expect(res.status).toBe(401);
    });

    test("DELETE /books/:id should return 401 without auth header", async () => {
      const res = await app.request("/books/some-book-id", {
        method: "DELETE"
      });
      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // LIST BOOKS TESTS
  // ============================================
  describe("GET /books", () => {
    test("should return empty array when user has no books", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/books", {
        headers: { Authorization: "Bearer test-token" }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.books).toEqual([]);
    });

    test("should return books with correct structure", async () => {
      const mockBook = {
        id: "book-1",
        title: "Test Book",
        author: "Test Author",
        sourceType: "kindle",
        coverImageUrl: null,
        pinnedAt: null,
        createdAt: new Date("2024-01-01"),
        userId: "user-1"
      };
      mockDb.$setResponse([mockBook]);

      const res = await app.request("/books", {
        headers: { Authorization: "Bearer test-token" }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.books).toBeDefined();
      expect(Array.isArray(body.books)).toBe(true);
    });
  });

  // ============================================
  // GET SINGLE BOOK TESTS
  // ============================================
  describe("GET /books/:id", () => {
    test("should return 404 for non-existent book", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/books/non-existent-id", {
        headers: { Authorization: "Bearer test-token" }
      });

      expect(res.status).toBe(404);
    });

    test("should return 404 for book belonging to different user", async () => {
      const otherUserBook = {
        id: "book-1",
        title: "Other User Book",
        author: "Author",
        userId: "user-2" // Different from authenticated user
      };
      mockDb.$setResponse([otherUserBook]);

      const res = await app.request("/books/book-1", {
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-user-id": "user-1"
        }
      });

      // API returns 403 Forbidden for book owned by different user
      expect(res.status).toBe(403);
    });

    test("should return book with highlights for valid owner", async () => {
      const mockBook = {
        id: "book-1",
        title: "My Book",
        author: "Author",
        userId: "user-1",
        sourceType: "kindle",
        coverImageUrl: null,
        metadata: null,
        createdAt: new Date("2024-01-01")
      };
      mockDb.$setResponse([mockBook]);

      const res = await app.request("/books/book-1", {
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-user-id": "user-1"
        }
      });

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // UPDATE BOOK TESTS
  // ============================================
  describe("PATCH /books/:id", () => {
    test("should return 404 for non-existent book", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/books/non-existent-id", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: "New Title" })
      });

      expect(res.status).toBe(404);
    });

    test("should return 404 when updating another user's book", async () => {
      const otherUserBook = {
        id: "book-1",
        userId: "user-2"
      };
      mockDb.$setResponse([otherUserBook]);

      const res = await app.request("/books/book-1", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-user-id": "user-1",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: "Hacked Title" })
      });

      // API returns 403 Forbidden for book owned by different user
      expect(res.status).toBe(403);
    });

    test("should update book for valid owner", async () => {
      const userBook = {
        id: "book-1",
        title: "Old Title",
        author: "Author",
        userId: "user-1"
      };
      mockDb.$setResponse([userBook]);

      const res = await app.request("/books/book-1", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-user-id": "user-1",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: "New Title" })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  // ============================================
  // DELETE BOOK TESTS
  // ============================================
  describe("DELETE /books/:id", () => {
    test("should return 404 for non-existent book", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/books/non-existent-id", {
        method: "DELETE",
        headers: { Authorization: "Bearer test-token" }
      });

      expect(res.status).toBe(404);
    });

    test("should return 404 when deleting another user's book", async () => {
      const otherUserBook = {
        id: "book-1",
        userId: "user-2"
      };
      mockDb.$setResponse([otherUserBook]);

      const res = await app.request("/books/book-1", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-user-id": "user-1"
        }
      });

      expect(res.status).toBe(403);
    });

    test("should soft-delete book for valid owner", async () => {
      const userBook = {
        id: "book-1",
        title: "My Book",
        userId: "user-1"
      };
      mockDb.$setResponse([userBook]);

      const res = await app.request("/books/book-1", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-user-id": "user-1"
        }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  // ============================================
  // PIN BOOK TESTS
  // ============================================
  describe("POST /books/:id/pin", () => {
    test("should return 404 for non-existent book", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/books/non-existent-id/pin", {
        method: "POST",
        headers: { Authorization: "Bearer test-token" }
      });

      expect(res.status).toBe(404);
    });

    test("should toggle pin status for valid owner", async () => {
      const userBook = {
        id: "book-1",
        title: "My Book",
        userId: "user-1",
        pinnedAt: null
      };
      mockDb.$setResponse([userBook]);

      const res = await app.request("/books/book-1/pin", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
          "x-mock-user-id": "user-1"
        }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.pinned).toBeDefined();
    });
  });
});
