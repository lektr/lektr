import { mock } from "bun:test";

export const mockDigestService = {
  triggerNow: mock(() => Promise.resolve()),
  generateDigestsForAllUsers: mock(() => Promise.resolve()),
};

export const digestService = mockDigestService;
