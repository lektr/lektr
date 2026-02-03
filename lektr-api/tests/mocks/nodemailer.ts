import { vi } from "vitest";

export const mockTransporter = {
  sendMail: vi.fn(() => Promise.resolve({ messageId: "test-id" })),
  verify: vi.fn(() => Promise.resolve(true)),
};

export const mockNodemailer = {
  createTransport: vi.fn<(config: Record<string, unknown>) => typeof mockTransporter>(() => mockTransporter),
};

export default mockNodemailer;
