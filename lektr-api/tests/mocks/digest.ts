import { vi } from "vitest";

export const mockDigestService = {
  triggerNow: vi.fn(() => Promise.resolve()),
  generateDigestsForAllUsers: vi.fn(() => Promise.resolve()),
};

export const digestService = mockDigestService;
