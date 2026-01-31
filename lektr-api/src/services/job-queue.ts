/**
 * Job Queue Service
 * 
 * PostgreSQL-backed job queue for reliable email delivery and other background tasks.
 */

import { db } from "../db";
import { jobs } from "../db/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { emailService } from "./email";

interface EmailJobPayload {
  to: string;
  subject: string;
  html: string;
}

class JobQueueService {
  private processing = false;
  private pollIntervalMs = 5000;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Start the job queue processor.
   */
  start(): void {
    if (this.pollTimer) return;
    
    console.log("📋 [JobQueue] Starting job processor...");
    this.pollTimer = setInterval(() => this.processJobs(), this.pollIntervalMs);
    // Also process immediately on start
    this.processJobs();
  }

  /**
   * Stop the job queue processor.
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      console.log("📋 [JobQueue] Stopped job processor");
    }
  }

  /**
   * Add an email job to the queue.
   */
  async enqueueEmail(to: string, subject: string, html: string, runAt?: Date): Promise<string> {
    const payload: EmailJobPayload = { to, subject, html };
    
    const [job] = await db.insert(jobs).values({
      type: "email",
      payload,
      runAt: runAt || new Date(),
    }).returning({ id: jobs.id });

    console.log(`📋 [JobQueue] Enqueued email job ${job.id} to ${to}`);
    return job.id;
  }

  /**
   * Process pending jobs.
   */
  private async processJobs(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      // Find jobs that are ready to run
      const pendingJobs = await db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.status, "pending"),
            lte(jobs.runAt, new Date())
          )
        )
        .limit(10);

      for (const job of pendingJobs) {
        await this.processJob(job);
      }
    } catch (error) {
      console.error("📋 [JobQueue] Error processing jobs:", error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a single job.
   */
  private async processJob(job: typeof jobs.$inferSelect): Promise<void> {
    // Mark as processing
    await db
      .update(jobs)
      .set({ status: "processing", attempts: job.attempts + 1 })
      .where(eq(jobs.id, job.id));

    try {
      if (job.type === "email") {
        const payload = job.payload as EmailJobPayload;
        const success = await emailService.sendEmail(payload.to, payload.subject, payload.html);
        
        if (success) {
          await db
            .update(jobs)
            .set({ status: "completed", completedAt: new Date() })
            .where(eq(jobs.id, job.id));
        } else {
          throw new Error("Email sending failed");
        }
      } else {
        console.warn(`📋 [JobQueue] Unknown job type: ${job.type}`);
        await db
          .update(jobs)
          .set({ status: "failed", lastError: `Unknown job type: ${job.type}` })
          .where(eq(jobs.id, job.id));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const newAttempts = job.attempts + 1;
      
      if (newAttempts >= job.maxAttempts) {
        await db
          .update(jobs)
          .set({ status: "failed", lastError: errorMessage })
          .where(eq(jobs.id, job.id));
        console.error(`📋 [JobQueue] Job ${job.id} failed permanently after ${newAttempts} attempts`);
      } else {
        // Retry with exponential backoff
        const retryDelay = Math.pow(2, newAttempts) * 1000; // 2s, 4s, 8s, etc.
        await db
          .update(jobs)
          .set({ 
            status: "pending", 
            lastError: errorMessage,
            runAt: new Date(Date.now() + retryDelay)
          })
          .where(eq(jobs.id, job.id));
        console.log(`📋 [JobQueue] Job ${job.id} will retry in ${retryDelay}ms`);
      }
    }
  }

  /**
   * Get queue status.
   */
  async getStatus(): Promise<{ pending: number; processing: number; failed: number; completed: number }> {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM jobs
    `);
    
    const row = (result as any).rows?.[0] || result[0] || {};
    return {
      pending: parseInt(row.pending || "0"),
      processing: parseInt(row.processing || "0"),
      failed: parseInt(row.failed || "0"),
      completed: parseInt(row.completed || "0"),
    };
  }
}

export const jobQueueService = new JobQueueService();
