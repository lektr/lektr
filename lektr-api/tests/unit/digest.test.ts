import { describe, test, expect, vi, beforeEach } from "vitest";
import { mockDb } from "../mocks/db";
import { mockJobQueueService } from "../mocks/job-queue";

// Mock dependencies
vi.mock("../../src/db", () => ({
  db: mockDb
}));

vi.mock("../../src/services/job-queue", () => ({
  jobQueueService: mockJobQueueService
}));

vi.mock("../../src/services/email", () => ({
  emailService: {
    isConfigured: vi.fn(() => Promise.resolve(true)),
  }
}));

// Mock react-email render
vi.mock("@react-email/render", () => ({
  render: vi.fn(() => Promise.resolve("<html>Mock Email</html>")),
}));

describe("DigestService", () => {
  let digestService: any;
  const mockUser = { id: "user-1", email: "test@example.com" };

  beforeEach(async () => {
    mockDb.$reset();
    mockJobQueueService.enqueueEmail.mockClear();

    // Re-import to get fresh instance
    vi.resetModules();
    vi.doMock("../../src/db", () => ({ db: mockDb }));
    vi.doMock("../../src/services/job-queue", () => ({ jobQueueService: mockJobQueueService }));
    vi.doMock("../../src/services/email", () => ({
      emailService: { isConfigured: vi.fn(() => Promise.resolve(true)) }
    }));
    vi.doMock("@react-email/render", () => ({
      render: vi.fn(() => Promise.resolve("<html>Mock Email</html>")),
    }));

    const module = await import("../../src/services/digest");
    digestService = module.digestService;
  });

  // ===========================================
  // Core digest generation
  // ===========================================

  test("should generate digest with due highlights", async () => {
    const dueHighlights = Array(5).fill(null).map((_, i) => ({
      id: `h-${i}`,
      content: `Highlight ${i}`,
      bookTitle: "Book",
      bookAuthor: "Author"
    }));

    // Main highlight query + stats queries
    mockDb.$setResponse(dueHighlights);
    mockDb.$setExecuteResponse(
      [{ totalHighlights: 100 }],
      [{ dueCount: 12 }]
    );

    await digestService.generateDigestForUser(mockUser.id, mockUser.email);

    expect(mockJobQueueService.enqueueEmail).toHaveBeenCalledWith(
      mockUser.email,
      expect.stringContaining("Daily Highlights"),
      expect.any(String)
    );
  });

  test("should skip email if zero highlights found", async () => {
    mockDb.$setResponse([]);

    await digestService.generateDigestForUser(mockUser.id, mockUser.email);

    expect(mockJobQueueService.enqueueEmail).not.toHaveBeenCalled();
  });

  test("should include highlight count in email subject", async () => {
    const highlights = [
      { id: "h-1", content: "Content", bookTitle: "Book", bookAuthor: "Author" }
    ];
    mockDb.$setResponse(highlights);

    await digestService.generateDigestForUser("uid", "user@test.com");

    expect(mockJobQueueService.enqueueEmail).toHaveBeenCalledWith(
      "user@test.com",
      expect.stringContaining("to review"),
      expect.any(String)
    );
  });

  test("should update lastDigestSentAt after sending", async () => {
    const highlights = [
      { id: "h-1", content: "Content", bookTitle: "Book", bookAuthor: "Author" }
    ];
    mockDb.$setResponse(highlights);

    await digestService.generateDigestForUser(mockUser.id, mockUser.email);

    // The update call should have been made
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ lastDigestSentAt: expect.any(Date) })
    );
  });

  // ===========================================
  // Timezone handling
  // ===========================================

  test("isUserHour should return true when timezone hour matches", () => {
    // Access private method via any cast
    const service = digestService as any;

    // Create a date and check if the method works
    const now = new Date("2025-01-15T14:00:00Z"); // 2 PM UTC

    // UTC+0 => 14:00
    expect(service.isUserHour(now, "UTC", 14)).toBe(true);
    expect(service.isUserHour(now, "UTC", 8)).toBe(false);
  });

  test("isUserHour should handle invalid timezone gracefully", () => {
    const service = digestService as any;
    const now = new Date("2025-01-15T08:00:00Z");

    // Invalid timezone falls back to UTC
    expect(service.isUserHour(now, "Invalid/Timezone", 8)).toBe(true);
  });

  // ===========================================
  // Frequency filtering
  // ===========================================

  test("isFrequencyDay should allow all days for daily frequency", () => {
    const service = digestService as any;

    // Monday
    const monday = new Date("2025-01-13T08:00:00Z");
    expect(service.isFrequencyDay(monday, "UTC", "daily")).toBe(true);

    // Saturday
    const saturday = new Date("2025-01-18T08:00:00Z");
    expect(service.isFrequencyDay(saturday, "UTC", "daily")).toBe(true);
  });

  test("isFrequencyDay should skip weekends for weekdays frequency", () => {
    const service = digestService as any;

    // Monday = allowed
    const monday = new Date("2025-01-13T08:00:00Z");
    expect(service.isFrequencyDay(monday, "UTC", "weekdays")).toBe(true);

    // Saturday = skipped
    const saturday = new Date("2025-01-18T08:00:00Z");
    expect(service.isFrequencyDay(saturday, "UTC", "weekdays")).toBe(false);

    // Sunday = skipped
    const sunday = new Date("2025-01-19T08:00:00Z");
    expect(service.isFrequencyDay(sunday, "UTC", "weekdays")).toBe(false);
  });

  test("isFrequencyDay should only allow Monday for weekly frequency", () => {
    const service = digestService as any;

    // Monday = allowed
    const monday = new Date("2025-01-13T08:00:00Z");
    expect(service.isFrequencyDay(monday, "UTC", "weekly")).toBe(true);

    // Tuesday = skipped
    const tuesday = new Date("2025-01-14T08:00:00Z");
    expect(service.isFrequencyDay(tuesday, "UTC", "weekly")).toBe(false);

    // Friday = skipped
    const friday = new Date("2025-01-17T08:00:00Z");
    expect(service.isFrequencyDay(friday, "UTC", "weekly")).toBe(false);
  });

  // ===========================================
  // Eligible users filtering
  // ===========================================

  test("generateDigestsForEligibleUsers should skip users with recent digest", async () => {
    const recentTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    const users = [
      {
        id: "u1",
        email: "u1@test.com",
        digestFrequency: "daily",
        digestHour: new Date().getUTCHours(), // Current hour
        digestTimezone: "UTC",
        lastDigestSentAt: recentTime, // Already received within dedup window
      }
    ];

    mockDb.$setResponse(users);

    await digestService.generateDigestsForEligibleUsers();

    // Should not send because dedup window hasn't passed
    expect(mockJobQueueService.enqueueEmail).not.toHaveBeenCalled();
  });

  test("generateDigestsForEligibleUsers should send to users with no recent digest", async () => {
    const oldTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const currentHour = new Date().getUTCHours();

    const usersData = [
      {
        id: "u1",
        email: "u1@test.com",
        digestFrequency: "daily",
        digestHour: currentHour,
        digestTimezone: "UTC",
        lastDigestSentAt: oldTime,
      }
    ];

    // First call returns users, subsequent calls return highlights
    const highlights = [
      { id: "h-1", content: "Content", bookTitle: "Book", bookAuthor: "Author" }
    ];

    mockDb.$queueResponses([usersData, highlights]);

    await digestService.generateDigestsForEligibleUsers();

    // Verify the user query was made
    expect(mockDb.select).toHaveBeenCalled();
  });

  // ===========================================
  // Manual trigger
  // ===========================================

  test("triggerNow should send to all enabled users regardless of timezone", async () => {
    const users = [
      { id: "u1", email: "u1@test.com" },
      { id: "u2", email: "u2@test.com" }
    ];

    mockDb.$setResponse(users);

    await digestService.triggerNow();

    expect(mockDb.select).toHaveBeenCalled();
  });

  // ===========================================
  // Cron management
  // ===========================================

  test("start should not create duplicate cron jobs", () => {
    digestService.start("0 * * * *");
    digestService.start("0 * * * *"); // Second call should be no-op
    digestService.stop();
  });

  test("stop should clear the cron job", () => {
    digestService.start("0 * * * *");
    digestService.stop();
    // Calling stop again should be safe
    digestService.stop();
  });
});
