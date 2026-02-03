import { describe, test, expect, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import { mockDb } from "../mocks/db";
import { mockEmailService } from "../mocks/email";
import { mockJobQueueService } from "../mocks/job-queue";
import { mockDigestService } from "../mocks/digest";

// Mock dependencies
mock.module("../../src/db", () => ({
  db: mockDb
}));

mock.module("../../src/services/email", () => ({
  emailService: mockEmailService
}));

mock.module("../../src/services/job-queue", () => ({
  jobQueueService: mockJobQueueService
}));

mock.module("../../src/services/digest", () => ({
  digestService: mockDigestService
}));

// Mock Auth Middleware to inject user
mock.module("../../src/middleware/auth", () => ({
  authMiddleware: async (c: any, next: any) => {
    // Check header for user role simulation
    const role = c.req.header("x-mock-role") || "admin";
    c.set("user", { id: "user-1", email: "admin@test.com", role });
    await next();
  }
}));

describe("Admin Email Routes", () => {
  let app: Hono;

  beforeEach(async () => {
    mockDb.select.mockClear();
    mockDb.update.mockClear();
    mockDb.insert.mockClear();
    mockEmailService.sendEmail.mockClear();
    mockEmailService.testConnection.mockClear();

    // Import router
    const { adminRouter } = await import("../../src/routes/admin");
    app = new Hono();
    app.route("/admin", adminRouter);
  });

  test("GET /email-settings should return settings with masked password", async () => {
    mockDb.$setResponse([
      { key: "smtp_host", value: "smtp.test.com" },
      { key: "smtp_pass", value: "secret-password" },
    ]);
    mockEmailService.isConfigured.mockResolvedValue(true);

    const res = await app.request("/admin/email-settings", {
      headers: { "x-mock-role": "admin" }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settings.smtp_host).toBe("smtp.test.com");
    expect(body.settings.smtp_pass).toBe("••••••••"); // Masked
    expect(body.isConfigured).toBe(true);
  });

  test("GET /email-settings should return 403 for non-admin", async () => {
    const res = await app.request("/admin/email-settings", {
      headers: { "x-mock-role": "user" }
    });
    expect(res.status).toBe(403);
  });

  test("PUT /email-settings should return 403 for non-admin", async () => {
    const res = await app.request("/admin/email-settings", {
      method: "PUT",
      headers: { "x-mock-role": "user" }
    });
    expect(res.status).toBe(403);
  });

  test("POST /test should return 403 for non-admin", async () => {
    const res = await app.request("/admin/email-settings/test", {
      method: "POST",
      headers: { "x-mock-role": "user" }
    });
    expect(res.status).toBe(403);
  });

  test("PUT /email-settings should update settings", async () => {
    mockDb.insert = mock(() => ({
      values: mock(() => ({
        onConflictDoUpdate: mock(() => Promise.resolve([]))
      }))
    }));

    const res = await app.request("/admin/email-settings", {
      method: "PUT",
      headers: {
        "x-mock-role": "admin",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        smtp_host: "new.host.com",
        smtp_pass: "new-pass"
      })
    });

    expect(res.status).toBe(200);
    expect(mockDb.insert).toHaveBeenCalledTimes(2); // host + pass
  });

  test("PUT /email-settings should skip masked password", async () => {
    mockDb.insert = mock(() => ({
      values: mock(() => ({
        onConflictDoUpdate: mock(() => Promise.resolve([]))
      }))
    }));

    const res = await app.request("/admin/email-settings", {
      method: "PUT",
      headers: {
        "x-mock-role": "admin",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        smtp_host: "new.host.com",
        smtp_pass: "••••••••" // Should be skipped
      })
    });

    expect(res.status).toBe(200);
    expect(mockDb.insert).toHaveBeenCalledTimes(1); // Only host, pass skipped
  });

  test("POST /test should send test email", async () => {
    mockEmailService.testConnection.mockResolvedValue({ success: true });
    mockEmailService.sendEmail.mockResolvedValue(true);

    const res = await app.request("/admin/email-settings/test", {
      method: "POST",
      headers: {
        "x-mock-role": "admin",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: "test@example.com" })
    });

    expect(res.status).toBe(200);
    expect(mockEmailService.testConnection).toHaveBeenCalled();
    expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
      "test@example.com",
      expect.stringContaining("Test Email"),
      expect.any(String)
    );
  });

  test("GET /job-queue/status should return status", async () => {
    mockJobQueueService.getStatus = mock(() => Promise.resolve({
      pending: 5,
      processing: 1,
      failed: 0,
      completed: 10
    }));

    const res = await app.request("/admin/job-queue/status", {
      headers: { "x-mock-role": "admin" }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pending).toBe(5);
    expect(body.completed).toBe(10);
  });

  test("POST /trigger-digest should return 403 for non-admin", async () => {
    const res = await app.request("/admin/trigger-digest", {
      method: "POST",
      headers: { "x-mock-role": "user" }
    });
    expect(res.status).toBe(403);
  });

  test("POST /trigger-digest should return 400 if email not configured", async () => {
    mockEmailService.isConfigured.mockResolvedValue(false);

    const res = await app.request("/admin/trigger-digest", {
      method: "POST",
      headers: { "x-mock-role": "admin" }
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("not configured");
  });

  test("POST /trigger-digest should trigger digests when email is configured", async () => {
    mockEmailService.isConfigured.mockResolvedValue(true);
    mockDigestService.triggerNow.mockClear();
    mockDigestService.triggerNow.mockResolvedValue(undefined);

    const res = await app.request("/admin/trigger-digest", {
      method: "POST",
      headers: { "x-mock-role": "admin" }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("being generated");
    expect(mockDigestService.triggerNow).toHaveBeenCalled();
  });
});
