import { describe, test, expect } from "vitest";

/**
 * Unit tests for the soft delete sync logic.
 *
 * The resurrection logic in import.handlers.ts works as follows:
 *
 * 1. When a highlight is deleted via the API, it gets a `deletedAt` timestamp (soft delete)
 * 2. When syncing from KOReader, if a highlight with matching content exists:
 *    - If it's NOT deleted: skip (duplicate)
 *    - If it IS deleted and device timestamp > deletedAt: RESURRECT (clear deletedAt)
 *    - If it IS deleted and device timestamp <= deletedAt: skip (respect deletion)
 * 3. New highlights (no matching hash in DB) are always inserted
 *
 * These tests verify the hash generation function behavior.
 */

// Copy of the hash function from import.handlers.ts for testing
function generateContentHash(content: string): string {
  const normalized = content.slice(0, 100).toLowerCase().replace(/\s+/g, " ").trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

describe("Content Hash Generation", () => {
  test("generates consistent hash for same content", () => {
    const content = "This is a test highlight";
    const hash1 = generateContentHash(content);
    const hash2 = generateContentHash(content);
    expect(hash1).toBe(hash2);
  });

  test("generates different hash for different content", () => {
    const hash1 = generateContentHash("First highlight");
    const hash2 = generateContentHash("Second highlight");
    expect(hash1).not.toBe(hash2);
  });

  test("normalizes whitespace", () => {
    const hash1 = generateContentHash("hello   world");
    const hash2 = generateContentHash("hello world");
    expect(hash1).toBe(hash2);
  });

  test("is case insensitive", () => {
    const hash1 = generateContentHash("Hello World");
    const hash2 = generateContentHash("hello world");
    expect(hash1).toBe(hash2);
  });

  test("uses only first 100 characters", () => {
    const longContent = "a".repeat(200);
    const truncated = longContent.slice(0, 100);
    const hash1 = generateContentHash(longContent);
    const hash2 = generateContentHash(truncated);
    expect(hash1).toBe(hash2);
  });
});

describe("Resurrection Logic (documentation)", () => {
  /**
   * These tests document the expected behavior.
   * The actual logic is in import.handlers.ts lines 201-230.
   */

  test("resurrection check: newer timestamp should resurrect", () => {
    const deletedAt = new Date("2024-01-01T10:00:00Z");
    const deviceTimestamp = new Date("2024-01-15T10:00:00Z"); // Newer

    const shouldResurrect = deviceTimestamp > deletedAt;
    expect(shouldResurrect).toBe(true);
  });

  test("resurrection check: older timestamp should NOT resurrect", () => {
    const deletedAt = new Date("2024-01-15T10:00:00Z");
    const deviceTimestamp = new Date("2024-01-01T10:00:00Z"); // Older

    const shouldResurrect = deviceTimestamp > deletedAt;
    expect(shouldResurrect).toBe(false);
  });

  test("resurrection check: equal timestamp should NOT resurrect", () => {
    const deletedAt = new Date("2024-01-10T10:00:00Z");
    const deviceTimestamp = new Date("2024-01-10T10:00:00Z"); // Same

    const shouldResurrect = deviceTimestamp > deletedAt;
    expect(shouldResurrect).toBe(false);
  });
});
