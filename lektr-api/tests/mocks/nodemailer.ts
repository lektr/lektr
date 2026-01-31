import { mock } from "bun:test";

export const mockTransporter = {
  sendMail: mock(() => Promise.resolve({ messageId: "test-id" })),
  verify: mock(() => Promise.resolve(true)),
};

export const mockNodemailer = {
  createTransport: mock(() => mockTransporter),
};

export default mockNodemailer;
