import { mock } from "bun:test";

export const mockEmailService = {
  sendEmail: mock(() => Promise.resolve(true)),
  testConnection: mock(() => Promise.resolve({ success: true })),
  isConfigured: mock(() => Promise.resolve(true)),
};

export const emailService = mockEmailService;
