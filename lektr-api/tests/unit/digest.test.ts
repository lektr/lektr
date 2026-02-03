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

// Mock react-email render to avoid actual rendering
vi.mock("@react-email/render", () => ({
  render: vi.fn(() => Promise.resolve("<html>Mock Email</html>")),
}));

describe("DigestService", () => {
  let digestService: any;
  const mockUser = { id: "user-1", email: "test@example.com" };

  beforeEach(async () => {
    mockDb.$reset();
    mockJobQueueService.enqueueEmail.mockClear();

    const module = await import("../../src/services/digest");
    digestService = module.digestService;
  });

  test("should generate digest with due highlights", async () => {
    // Mock 5 due highlights
    const dueHighlights = Array(5).fill(null).map((_, i) => ({
      id: `h-${i}`,
      content: `Highlight ${i}`,
      bookTitle: "Book",
      bookAuthor: "Author"
    }));

    // Set the response for all DB queries
    mockDb.$setResponse(dueHighlights);

    await digestService.generateDigestForUser(mockUser.id, mockUser.email);

    expect(mockJobQueueService.enqueueEmail).toHaveBeenCalledWith(
      mockUser.email,
      expect.stringContaining("Daily Highlights"),
      expect.any(String)
    );
  });

  test("should skip email if zero highlights found", async () => {
    // Empty response for all queries
    mockDb.$setResponse([]);

    await digestService.generateDigestForUser(mockUser.id, mockUser.email);

    expect(mockJobQueueService.enqueueEmail).not.toHaveBeenCalled();
  });

  test("generateDigestsForAllUsers should iterate users", async () => {
    const users = [
      { id: "u1", email: "u1@test.com" },
      { id: "u2", email: "u2@test.com" }
    ];

    // First call returns users, subsequent calls return empty highlights
    mockDb.$setResponse(users);

    await digestService.generateDigestsForAllUsers();

    // Verify users were fetched
    expect(mockDb.select).toHaveBeenCalled();
  });

  test("should enqueue email with correct subject", async () => {
    const highlights = [
      { id: "h-1", content: "Content", bookTitle: "Book", bookAuthor: "Author" }
    ];
    mockDb.$setResponse(highlights);

    await digestService.generateDigestForUser("uid", "user@test.com");

    expect(mockJobQueueService.enqueueEmail).toHaveBeenCalledWith(
      "user@test.com",
      "📚 Your Daily Highlights",
      expect.any(String)
    );
  });
});
