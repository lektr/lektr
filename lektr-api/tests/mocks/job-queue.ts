import { mock } from "bun:test";

export const mockJobQueueService = {
  enqueueEmail: mock(() => Promise.resolve("job-id")),
  start: mock(),
  stop: mock(),
  getStatus: mock(() => Promise.resolve({ pending: 0, processing: 0, failed: 0, completed: 0 })),
  pollTimer: null as any,
};

export const jobQueueService = mockJobQueueService;

