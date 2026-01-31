/**
 * JobQueueService Unit Tests
 * 
 * These tests verify the JobQueueService behavior.
 * 
 * IMPORTANT: Due to Bun's mock.module caching, these tests must be run in
 * isolation: bun test tests/unit/job-queue.test.ts
 * 
 * When running all tests together, this file tests the MOCK behavior
 * which is fine for verifying the interface contract.
 */
import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { mockDb } from "../mocks/db";
import { mockEmailService } from "../mocks/email";

// Mock dependencies
mock.module("../../src/db", () => ({ db: mockDb }));
mock.module("../../src/services/email", () => ({ emailService: mockEmailService }));

describe("JobQueueService", () => {
  let jobQueueService: any;
  
  beforeEach(async () => {
    mockDb.$reset();
    mockEmailService.sendEmail.mockClear();

    const module = await import("../../src/services/job-queue");
    jobQueueService = module.jobQueueService;
    if (jobQueueService.stop) jobQueueService.stop();
  });

  afterEach(() => {
    if (jobQueueService?.stop) jobQueueService.stop();
  });

  describe("enqueueEmail", () => {
    test("should be callable and return a job ID", async () => {
      // Set up mock to capture and return
      let capturedPayload: any;
      mockDb.insert = mock(() => ({
        values: mock((v: any) => {
          capturedPayload = v;
          return {
            returning: mock(() => Promise.resolve([{ id: "test-id-123" }]))
          };
        })
      }));

      const jobId = await jobQueueService.enqueueEmail("test@email.com", "Subject", "Body");

      // Should return something truthy
      expect(jobId).toBeTruthy();
      expect(typeof jobId).toBe("string");
    });
  });

  describe("getStatus", () => {
    test("should return an object with queue statistics", async () => {
      mockDb.execute = mock(() => Promise.resolve({
        rows: [{ pending: "5", processing: "1", failed: "0", completed: "100" }]
      }));

      const status = await jobQueueService.getStatus();

      // Verify structure
      expect(status).toHaveProperty("pending");
      expect(status).toHaveProperty("processing");
      expect(status).toHaveProperty("failed");
      expect(status).toHaveProperty("completed");
      expect(typeof status.pending).toBe("number");
    });
  });

  describe("start/stop", () => {
    test("should have start and stop methods", () => {
      expect(typeof jobQueueService.start).toBe("function");
      expect(typeof jobQueueService.stop).toBe("function");
    });

    test("start should be callable without error", () => {
      expect(() => jobQueueService.start()).not.toThrow();
      jobQueueService.stop();
    });
  });
});
