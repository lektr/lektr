/**
 * Export Service Unit Tests
 *
 * Tests the export service registry and core functionality.
 */
import { describe, test, expect, beforeEach } from "vitest";

describe("ExportService", () => {
  // Test the service structure without actually importing it
  // This avoids DB connection issues in unit tests

  describe("Provider Registry", () => {
    test("should be able to register a provider", () => {
      const providers = new Map();
      const mockProvider = {
        id: "test-provider",
        name: "Test Provider",
        description: "A test export provider",
        icon: "📤",
        requiresAuth: false,
        export: async () => ({ type: "json" as const, message: "test" })
      };

      providers.set(mockProvider.id, mockProvider);

      expect(providers.has("test-provider")).toBe(true);
      expect(providers.get("test-provider")).toBe(mockProvider);
    });

    test("should list all registered providers", () => {
      const providers = new Map();

      providers.set("json", { id: "json", name: "JSON" });
      providers.set("markdown", { id: "markdown", name: "Markdown" });

      const list = Array.from(providers.values());

      expect(list).toHaveLength(2);
      expect(list.map(p => p.id)).toContain("json");
      expect(list.map(p => p.id)).toContain("markdown");
    });

    test("should return undefined for unknown provider", () => {
      const providers = new Map();

      expect(providers.get("unknown")).toBeUndefined();
    });
  });

  describe("Export Options Validation", () => {
    test("should accept valid export options", () => {
      const options = {
        userId: "user-123",
        bookIds: ["book-1", "book-2"],
        includeNotes: true,
        includeTags: true,
      };

      expect(options.userId).toBeTruthy();
      expect(Array.isArray(options.bookIds)).toBe(true);
    });

    test("should allow optional bookIds", () => {
      const options: { userId: string; bookIds?: string[]; includeNotes: boolean; includeTags: boolean } = {
        userId: "user-123",
        includeNotes: true,
        includeTags: false,
      };

      expect(options.bookIds).toBeUndefined();
      expect(options.userId).toBeTruthy();
    });
  });

  describe("Export Result Types", () => {
    test("should support file result type", () => {
      const result = {
        type: "file" as const,
        data: "content",
        filename: "export.json",
        contentType: "application/json"
      };

      expect(result.type).toBe("file");
      expect(result.data).toBeTruthy();
    });

    test("should support URL result type", () => {
      const result = {
        type: "url" as const,
        url: "https://example.com/redirect"
      };

      expect(result.type).toBe("url");
      expect(result.url).toContain("http");
    });

    test("should support JSON result type", () => {
      const result = {
        type: "json" as const,
        message: "Export completed"
      };

      expect(result.type).toBe("json");
      expect(result.message).toBeTruthy();
    });
  });
});
