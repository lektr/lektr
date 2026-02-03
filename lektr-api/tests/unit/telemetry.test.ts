/**
 * Telemetry Service Unit Tests
 *
 * Tests the telemetry service behavior with mocked dependencies.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { mockDb } from "../mocks/db";

// Mock dependencies
vi.mock("../../src/db", () => ({ db: mockDb }));

// Mock getSetting to control telemetry_enabled
let mockTelemetryEnabled = "true";
vi.mock("../../src/routes/settings", () => ({
  getSetting: vi.fn(async (key: string) => {
    if (key === "telemetry_enabled") return mockTelemetryEnabled;
    return null;
  })
}));

// Mock PostHog
const mockPostHogCapture = vi.fn(() => {});
const mockPostHogIdentify = vi.fn(() => {});
const mockPostHogShutdown = vi.fn(() => Promise.resolve());
const mockPostHogOn = vi.fn(() => {});

vi.mock("posthog-node", () => ({
  PostHog: class MockPostHog {
    capture = mockPostHogCapture;
    identify = mockPostHogIdentify;
    shutdown = mockPostHogShutdown;
    on = mockPostHogOn;
  }
}));

describe("TelemetryService", () => {
  let telemetryService: any;

  beforeEach(async () => {
    mockDb.$reset();
    mockPostHogCapture.mockClear();
    mockPostHogIdentify.mockClear();
    mockPostHogShutdown.mockClear();
    mockTelemetryEnabled = "true";

    // Re-import to get fresh instance
    const module = await import("../../src/services/telemetry");
    telemetryService = module.telemetryService;
  });

  describe("init", () => {
    test("should be callable", async () => {
      const result = await telemetryService.init();
      // init should complete without throwing
      expect(result).toBeUndefined();
    });
  });

  describe("track", () => {
    test("should be callable with event and properties", async () => {
      const result = await telemetryService.track("test_event", { foo: "bar" });
      expect(result).toBeUndefined();
    });

    test("should work when telemetry is disabled", async () => {
      mockTelemetryEnabled = "false";
      const result = await telemetryService.track("test_event", { foo: "bar" });
      expect(result).toBeUndefined();
    });
  });

  describe("identify", () => {
    test("should be callable with userId and properties", async () => {
      const result = await telemetryService.identify("user-123", { name: "Test User" });
      expect(result).toBeUndefined();
    });

    test("should work when telemetry is disabled", async () => {
      mockTelemetryEnabled = "false";
      const result = await telemetryService.identify("user-123", {});
      expect(result).toBeUndefined();
    });
  });

  describe("getTelemetryStats", () => {
    test("should return stats object with counts", async () => {
      // Mock DB to return counts
      mockDb.$setResponse([{ count: 10 }]);

      const stats = await telemetryService.getTelemetryStats();

      expect(stats).toHaveProperty("totalBooks");
      expect(stats).toHaveProperty("totalHighlights");
      expect(stats).toHaveProperty("totalTags");
    });

    test("should return numeric values in stats", async () => {
      mockDb.$setResponse([{ count: 5 }]);

      const stats = await telemetryService.getTelemetryStats();

      expect(typeof stats.totalBooks).toBe("number");
      expect(typeof stats.totalHighlights).toBe("number");
      expect(typeof stats.totalTags).toBe("number");
    });
  });

  describe("shutdown", () => {
    test("should be callable", async () => {
      const result = await telemetryService.shutdown();
      expect(result).toBeUndefined();
    });
  });
});
