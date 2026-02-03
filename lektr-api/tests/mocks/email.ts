import { vi } from "vitest";

export const mockEmailService = {
  sendEmail: vi.fn(() => Promise.resolve(true)),
  testConnection: vi.fn(() => Promise.resolve({ success: true })),
  isConfigured: vi.fn(() => Promise.resolve(true)),
};

export const emailService = mockEmailService;
