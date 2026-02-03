import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { mockDb } from "../mocks/db";
import { mockNodemailer, mockTransporter } from "../mocks/nodemailer";

// Mock dependencies
// Note: Paths are resolved relative to THIS file
vi.mock("../../src/db", () => ({
  db: mockDb
}));

vi.mock("nodemailer", () => {
  return {
    default: mockNodemailer,
    createTransport: mockNodemailer.createTransport
  };
});

describe("EmailService", () => {
  let emailService: any;

  beforeEach(async () => {
    mockDb.select.mockClear();
    mockDb.$setResponse([]);
    mockNodemailer.createTransport.mockClear();
    mockTransporter.sendMail.mockClear();

    // Re-import service for each test to ensure fresh state/mocks
    const module = await import("../../src/services/email");
    emailService = module.emailService;

    // Reset internal state
    emailService.config = null;
    emailService.transporter = null;
    emailService.configLoadedAt = null;
  });

  test("should be unconfigured by default if no settings", async () => {
    const isConfigured = await emailService.isConfigured();
    expect(isConfigured).toBe(false);
  });

  test("should load config from database", async () => {
    mockDb.$setResponse([
      { key: "smtp_host", value: "smtp.test.com" },
      { key: "smtp_port", value: "587" },
      { key: "smtp_user", value: "user" },
      { key: "smtp_pass", value: "pass" },
    ]);

    const isConfigured = await emailService.isConfigured();
    expect(isConfigured).toBe(true);
    expect(mockDb.select).toHaveBeenCalled();
  });

  test("should create transporter with loaded config", async () => {
    mockDb.$setResponse([
      { key: "smtp_host", value: "smtp.test.com" },
      { key: "smtp_port", value: "587" },
    ]);

    await emailService.sendEmail("to@test.com", "S", "B");

    expect(mockNodemailer.createTransport).toHaveBeenCalled();
    const calls = mockNodemailer.createTransport.mock.calls;
    const firstCall = calls[0];
    if (firstCall) {
      const callArgs = firstCall[0] as any;
      expect(callArgs).toMatchObject({
        host: "smtp.test.com",
        port: 587
      });
    }
  });

  test("should send email using transporter", async () => {
    mockDb.$setResponse([
      { key: "smtp_host", value: "smtp.test.com" },
    ]);

    const result = await emailService.sendEmail("to@test.com", "Subj", "Body");

    expect(result).toBe(true);
    expect(mockTransporter.sendMail).toHaveBeenCalled();
  });

  test("should fallback to environment variables if DB is empty", async () => {
    const originalEnv = process.env.SMTP_HOST;
    process.env.SMTP_HOST = "smtp.env.com";

    mockDb.$setResponse([]);

    try {
      // Force reload
      emailService.config = null;
      emailService.transporter = null;

      const isConfigured = await emailService.isConfigured();
      expect(isConfigured).toBe(true);

      await emailService.sendEmail("to@test.com", "S", "B");

      expect(mockNodemailer.createTransport).toHaveBeenCalled();
      const calls = mockNodemailer.createTransport.mock.calls;
      const firstCall = calls[0];
      if (firstCall) {
        const callArgs = firstCall[0] as any;
        expect(callArgs.host).toBe("smtp.env.com");
      }
    } finally {
      if (originalEnv) process.env.SMTP_HOST = originalEnv;
      else delete process.env.SMTP_HOST;
    }
  });

  test("should return false if sending fails", async () => {
    mockDb.$setResponse([
      { key: "smtp_host", value: "smtp.test.com" },
    ]);

    mockTransporter.sendMail.mockImplementationOnce(() => Promise.reject(new Error("Failed")));

    // Suppress console.error for this test since we expect it to log an error
    const originalError = console.error;
    console.error = () => {};

    const result = await emailService.sendEmail("to@test.com", "S", "B");

    console.error = originalError;
    expect(result).toBe(false);
  });
});
