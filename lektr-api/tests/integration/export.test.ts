/**
 * Export API Integration Tests
 *
 * Tests HTTP behavior of export endpoints including:
 * - Public providers listing (no auth)
 * - Auth required for export trigger
 * - Provider not found handling
 * - File, JSON, and URL result types
 * - Security: auth enforcement on export
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// Mock auth middleware
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

const mockGetProviders = vi.fn();
const mockGetProvider = vi.fn();
const mockExport = vi.fn();

vi.mock("../../src/services/export", () => ({
  exportService: {
    getProviders: () => mockGetProviders(),
    getProvider: (...args: any[]) => mockGetProvider(...args),
    export: (...args: any[]) => mockExport(...args),
  },
}));

describe("Export API", () => {
  let app: Hono;

  beforeEach(async () => {
    mockGetProviders.mockReset();
    mockGetProvider.mockReset();
    mockExport.mockReset();

    const { exportOpenAPI } = await import("../../src/openapi/export.handlers");
    app = new Hono();
    app.route("/export", exportOpenAPI);
  });

  // ============================================
  // PUBLIC PROVIDERS LIST
  // ============================================
  describe("GET /export/providers", () => {
    test("should return providers list without auth", async () => {
      mockGetProviders.mockReturnValue([
        { id: "json", name: "JSON", description: "Export as JSON" },
        { id: "markdown", name: "Markdown", description: "Export as Markdown" },
      ]);

      const res = await app.request("/export/providers");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.providers).toHaveLength(2);
      expect(body.providers[0].id).toBe("json");
      expect(body.providers[1].id).toBe("markdown");
    });

    test("should return empty list when no providers registered", async () => {
      mockGetProviders.mockReturnValue([]);

      const res = await app.request("/export/providers");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.providers).toEqual([]);
    });
  });

  // ============================================
  // AUTHENTICATION
  // ============================================
  describe("Authentication", () => {
    test("POST /export/:providerId should return 401 without auth", async () => {
      const res = await app.request("/export/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // TRIGGER EXPORT
  // ============================================
  describe("POST /export/:providerId", () => {
    test("should return 404 for unknown provider", async () => {
      mockGetProvider.mockReturnValue(undefined);

      const res = await app.request("/export/unknown", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(404);
    });

    test("should handle file result type", async () => {
      mockGetProvider.mockReturnValue({ id: "json", name: "JSON" });
      mockExport.mockResolvedValue({
        type: "file",
        data: '{"highlights": []}',
        filename: "export.json",
        contentType: "application/json",
      });

      const res = await app.request("/export/json", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ includeNotes: true, includeTags: true }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("application/json");
      expect(res.headers.get("Content-Disposition")).toContain("export.json");
    });

    test("should handle URL result type", async () => {
      mockGetProvider.mockReturnValue({ id: "notion", name: "Notion" });
      mockExport.mockResolvedValue({
        type: "url",
        url: "https://notion.so/redirect-123",
      });

      const res = await app.request("/export/notion", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.redirect).toBe("https://notion.so/redirect-123");
    });

    test("should handle JSON result type", async () => {
      mockGetProvider.mockReturnValue({ id: "test", name: "Test" });
      mockExport.mockResolvedValue({
        type: "json",
        message: "Export completed successfully",
      });

      const res = await app.request("/export/test", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("Export completed successfully");
    });

    test("should return 500 on export error", async () => {
      mockGetProvider.mockReturnValue({ id: "json", name: "JSON" });
      mockExport.mockRejectedValue(new Error("Export failed"));
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await app.request("/export/json", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(500);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // ============================================
  // SECURITY
  // ============================================
  describe("Security", () => {
    test("export trigger requires auth even though providers list is public", async () => {
      const res = await app.request("/export/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(401);
    });
  });
});
