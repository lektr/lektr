import { vi } from "vitest";

export const mockJobQueueService = {
  enqueueEmail: vi.fn(() => Promise.resolve("job-id")),
  start: vi.fn(),
  stop: vi.fn(),
  getStatus: vi.fn(() => Promise.resolve({ pending: 0, processing: 0, failed: 0, completed: 0 })),
  pollTimer: null as any,
};

export const jobQueueService = mockJobQueueService;

