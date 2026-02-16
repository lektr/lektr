/**
 * Import API Integration Tests
 *
 * Tests HTTP behavior of import endpoints including:
 * - Authentication requirements
 * - JSON import (KOReader format)
 * - Unsupported source rejection
 * - Manual highlight addition
 * - Kindle import
 * - Security: user isolation, SQL injection in content
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

vi.mock("../../src/services/embedding-queue", () => ({
  embeddingQueue: {
    addBatch: vi.fn(),
    add: vi.fn(),
  },
}));

vi.mock("../../src/services/metadata-queue", () => ({
  metadataQueue: {
    add: vi.fn(),
  },
}));

vi.mock("../../src/services/metadata", () => ({
  metadataService: {
    hasProviders: vi.fn(() => false),
  },
}));

vi.mock("../../src/services/covers", () => ({
  downloadCover: vi.fn(() => Promise.resolve(null)),
  coverExists: vi.fn(() => false),
  getCoverPath: vi.fn(() => ""),
}));

vi.mock("../../src/services/telemetry", () => ({
  telemetryService: {
    track: vi.fn(() => Promise.resolve()),
    getTelemetryStats: vi.fn(() => Promise.resolve({ totalBooks: 0, totalHighlights: 0, totalTags: 0 })),
  },
}));

vi.mock("../../src/openapi/settings.handlers", async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>;
  return {
    ...original,
    getSetting: vi.fn(async () => "5000"),
  };
});

describe("Import API", () => {
  let app: Hono;

  beforeEach(async () => {
    mockDb.$reset();

    const { importOpenAPI } = await import("../../src/openapi/import.handlers");
    app = new Hono();
    app.route("/import", importOpenAPI);
  });

  // ============================================
  // AUTHENTICATION
  // ============================================
  describe("Authentication", () => {
    test("POST /import should return 401 without auth", async () => {
      const res = await app.request("/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "koreader", data: {} }),
      });
      expect(res.status).toBe(401);
    });

    test("POST /import/manual should return 401 without auth", async () => {
      const res = await app.request("/import/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Book", content: "Highlight" }),
      });
      expect(res.status).toBe(401);
    });

    test("POST /import/kindle should return 401 without auth", async () => {
      const res = await app.request("/import/kindle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Book", content: "Highlight" }),
      });
      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // JSON IMPORT (KOReader)
  // ============================================
  describe("POST /import (JSON)", () => {
    test("should reject unsupported source", async () => {
      const res = await app.request("/import", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: "unsupported", data: {} }),
      });

      expect(res.status).toBe(400);
    });

    test("should reject missing data", async () => {
      const res = await app.request("/import", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: "koreader" }),
      });

      expect(res.status).toBe(400);
    });

    test("should import KOReader highlights", async () => {
      // The handler makes these DB calls in order:
      // 1. insert syncHistory → returning [{ id: "sync-1" }]
      // 2. select books by userId (md5sum check) → []
      // 3. select books by userId+title → [] (no existing book)
      // 4. insert books → returning [{ id: "book-1" }]
      // 5. select highlights by bookId (duplicate check) → []
      // 6. insert highlight #1 (no returning, just awaited)
      // 7. insert highlight #2
      // 8. update syncHistory
      mockDb.$queueResponses([
        [{ id: "sync-1" }],                     // 1. syncHistory insert
        [],                                       // 2. books by userId (md5sum scan)
        [],                                       // 3. books by userId+title
        [{ id: "book-1", title: "Test Book" }],  // 4. new book insert
        [],                                       // 5. existing highlights
        [],                                       // 6. highlight insert #1
        [],                                       // 7. highlight insert #2
        [],                                       // 8. syncHistory update
      ]);

      const koreaderData = {
        source: "koreader",
        data: {
          title: "Test Book",
          author: "Author",
          md5sum: "abc123",
          entries: [
            { text: "First highlight", chapter: "Ch 1", page: 1 },
            { text: "Second highlight", chapter: "Ch 2", page: 5 },
          ],
        },
      };

      const res = await app.request("/import", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(koreaderData),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.source).toBe("koreader");
      expect(body.highlightsImported).toBe(2);
    });
  });

  // ============================================
  // MANUAL HIGHLIGHT
  // ============================================
  describe("POST /import/manual", () => {
    test("should return 400 when title is missing", async () => {
      const res = await app.request("/import/manual", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: "Some highlight" }),
      });

      expect(res.status).toBe(400);
    });

    test("should return 400 when content is missing", async () => {
      const res = await app.request("/import/manual", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Book Title" }),
      });

      expect(res.status).toBe(400);
    });

    test("should return 400 when title is empty string", async () => {
      const res = await app.request("/import/manual", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "  ", content: "Highlight" }),
      });

      expect(res.status).toBe(400);
    });

    test("should return 400 when content is empty string", async () => {
      const res = await app.request("/import/manual", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Book", content: "  " }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // KINDLE IMPORT
  // ============================================
  describe("POST /import/kindle", () => {
    test("should return 400 when single format is missing title", async () => {
      const res = await app.request("/import/kindle", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: "Highlight" }),
      });

      expect(res.status).toBe(400);
    });

    test("should return 400 when single format is missing content", async () => {
      const res = await app.request("/import/kindle", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Book" }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // SECURITY
  // ============================================
  describe("Security", () => {
    test("SQL injection in book title should not cause error", async () => {
      const maliciousTitle = "'; DROP TABLE books; --";

      // db.query.books.findFirst → no existing book
      mockDb.$setQueryResponse(undefined);
      // Queued responses for the manual import flow:
      // 1. insert book returning
      // 2. select existing highlights (duplicate check)
      // 3. insert highlight returning
      mockDb.$queueResponses([
        [{ id: "book-sqli", title: maliciousTitle }],    // insert book
        [],                                                // existing highlights
        [{ id: "h-sqli", content: "Safe highlight content", bookId: "book-sqli" }], // insert highlight
      ]);

      const res = await app.request("/import/manual", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: maliciousTitle,
          content: "Safe highlight content",
        }),
      });

      // Parameterized queries safely store the malicious string as-is
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.bookId).toBe("book-sqli");
    });

    test("SQL injection in highlight content should not cause error", async () => {
      const maliciousContent = "'; DELETE FROM highlights; --";

      // db.query.books.findFirst → no existing book
      mockDb.$setQueryResponse(undefined);
      mockDb.$queueResponses([
        [{ id: "book-safe", title: "Safe Book" }],        // insert book
        [],                                                 // existing highlights
        [{ id: "h-sqli2", content: maliciousContent, bookId: "book-safe" }], // insert highlight
      ]);

      const res = await app.request("/import/manual", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Safe Book",
          content: maliciousContent,
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.highlightId).toBe("h-sqli2");
    });
  });
});
