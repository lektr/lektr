/**
 * Digest Service
 *
 * Generates and sends daily digest emails using spaced repetition (FSRS).
 * Supports per-user timezone-aware scheduling, configurable frequency,
 * and duplicate prevention.
 */

import { render } from "@react-email/render";
import cron from "node-cron";
import { db } from "../db";
import { users, highlights, books } from "../db/schema";
import { eq, and, lte, isNull, sql, ne, or } from "drizzle-orm";
import { jobQueueService } from "./job-queue";
import { emailService } from "./email";
import DailyDigestEmail from "../emails/daily-digest";

const HIGHLIGHTS_PER_DIGEST = 5;
const DEDUP_WINDOW_HOURS = 20; // Don't send another digest within this window

class DigestService {
  private cronJob: ReturnType<typeof cron.schedule> | null = null;

  /**
   * Start the digest cron job.
   * Runs every hour to check for users whose local time matches their preferred hour.
   */
  start(cronExpression = "0 * * * *"): void {
    if (this.cronJob) return;

    this.checkSmtpOnStartup();

    console.log(`📬 [Digest] Starting hourly digest cron (${cronExpression})`);

    this.cronJob = cron.schedule(cronExpression, async () => {
      const utcHour = new Date().getUTCHours();
      console.log(`📬 [Digest] Hourly tick at UTC ${utcHour}:00`);
      await this.generateDigestsForEligibleUsers();
    });
  }

  /**
   * Stop the cron job.
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log("📬 [Digest] Stopped digest cron");
    }
  }

  /**
   * Check SMTP configuration on startup and log a warning if not configured.
   */
  private async checkSmtpOnStartup(): Promise<void> {
    try {
      const configured = await emailService.isConfigured();
      if (!configured) {
        console.warn(
          "⚠️  [Digest] SMTP is not configured! Daily digest emails will not be sent. " +
          "Configure SMTP in Admin → Settings or via environment variables."
        );
      }
    } catch (error) {
      console.error("📬 [Digest] Failed to check SMTP configuration:", error);
    }
  }

  /**
   * Find users eligible for digest at the current UTC hour.
   * Matches users whose (digestHour) in their timezone corresponds to the current UTC hour.
   * Also checks frequency rules (weekdays-only, weekly = Monday only).
   * Skips users who received a digest within the dedup window.
   */
  async generateDigestsForEligibleUsers(): Promise<void> {
    const now = new Date();
    const dedupCutoff = new Date(now.getTime() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000);

    // Find users where:
    // 1. Digest is enabled
    // 2. Their local time matches their preferred hour
    // 3. They haven't received a digest within the dedup window
    // 4. Their frequency allows today
    const eligibleUsers = await db
      .select({
        id: users.id,
        email: users.email,
        digestFrequency: users.digestFrequency,
        digestHour: users.digestHour,
        digestTimezone: users.digestTimezone,
        lastDigestSentAt: users.lastDigestSentAt,
      })
      .from(users)
      .where(ne(users.digestEnabled, "false"));

    // Filter in application layer for timezone + dedup + frequency
    const usersToProcess = eligibleUsers.filter(user => {
      const tz = user.digestTimezone || "UTC";
      const preferredHour = user.digestHour ?? 8;
      const frequency = user.digestFrequency || "daily";

      // Check if current time in user's timezone matches their preferred hour
      if (!this.isUserHour(now, tz, preferredHour)) {
        return false;
      }

      // Check dedup window
      if (user.lastDigestSentAt && user.lastDigestSentAt > dedupCutoff) {
        return false;
      }

      // Check frequency
      if (!this.isFrequencyDay(now, tz, frequency)) {
        return false;
      }

      return true;
    });

    if (usersToProcess.length === 0) {
      return; // Silent return — this fires every hour, most hours will have 0 eligible users
    }

    console.log(`📬 [Digest] Generating digests for ${usersToProcess.length} user(s)`);

    for (const user of usersToProcess) {
      try {
        await this.generateDigestForUser(user.id, user.email);
      } catch (error) {
        console.error(`📬 [Digest] Error generating digest for ${user.email}:`, error);
      }
    }
  }

  /**
   * Check if the current UTC time corresponds to the user's preferred hour in their timezone.
   */
  private isUserHour(now: Date, timezone: string, preferredHour: number): boolean {
    try {
      const userHour = parseInt(
        now.toLocaleString("en-US", { timeZone: timezone, hour: "numeric", hour12: false }),
        10
      );
      return userHour === preferredHour;
    } catch {
      // Invalid timezone — fall back to UTC comparison
      return now.getUTCHours() === preferredHour;
    }
  }

  /**
   * Check if today is a valid day for the user's digest frequency.
   */
  private isFrequencyDay(now: Date, timezone: string, frequency: string): boolean {
    if (frequency === "daily") return true;

    try {
      const dayStr = now.toLocaleString("en-US", { timeZone: timezone, weekday: "short" });
      const day = dayStr.toLowerCase(); // "mon", "tue", etc.

      if (frequency === "weekdays") {
        return !["sat", "sun"].includes(day);
      }
      if (frequency === "weekly") {
        return day === "mon"; // Weekly = Monday only
      }
    } catch {
      // Invalid timezone — treat as daily
    }

    return true;
  }

  /**
   * Generate a digest for a single user using FSRS spaced repetition.
   */
  async generateDigestForUser(userId: string, userEmail: string): Promise<void> {
    const now = new Date();

    // 1. Get highlights due for review (FSRS)
    const dueHighlights = await db
      .select({
        id: highlights.id,
        content: highlights.content,
        bookTitle: books.title,
        bookAuthor: books.author,
      })
      .from(highlights)
      .innerJoin(books, eq(highlights.bookId, books.id))
      .where(
        and(
          eq(highlights.userId, userId),
          isNull(highlights.deletedAt),
          sql`(fsrs_card->>'due')::timestamp <= ${now.toISOString()}::timestamp`
        )
      )
      .limit(HIGHLIGHTS_PER_DIGEST);

    let selectedHighlights = dueHighlights;

    // 2. If not enough due highlights, get new/unreviewed ones
    if (selectedHighlights.length < HIGHLIGHTS_PER_DIGEST) {
      const needed = HIGHLIGHTS_PER_DIGEST - selectedHighlights.length;
      const existingIds = selectedHighlights.map(h => h.id);

      const newHighlights = await db
        .select({
          id: highlights.id,
          content: highlights.content,
          bookTitle: books.title,
          bookAuthor: books.author,
        })
        .from(highlights)
        .innerJoin(books, eq(highlights.bookId, books.id))
        .where(
          and(
            eq(highlights.userId, userId),
            isNull(highlights.deletedAt),
            isNull(highlights.fsrsCard),
            existingIds.length > 0
              ? sql`${highlights.id} NOT IN (${sql.join(existingIds.map(id => sql`${id}::uuid`), sql`, `)})`
              : sql`TRUE`
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(needed);

      selectedHighlights = [...selectedHighlights, ...newHighlights];
    }

    // 3. If still not enough, get random highlights for discovery
    if (selectedHighlights.length < HIGHLIGHTS_PER_DIGEST) {
      const needed = HIGHLIGHTS_PER_DIGEST - selectedHighlights.length;
      const existingIds = selectedHighlights.map(h => h.id);

      const randomHighlights = await db
        .select({
          id: highlights.id,
          content: highlights.content,
          bookTitle: books.title,
          bookAuthor: books.author,
        })
        .from(highlights)
        .innerJoin(books, eq(highlights.bookId, books.id))
        .where(
          and(
            eq(highlights.userId, userId),
            isNull(highlights.deletedAt),
            existingIds.length > 0
              ? sql`${highlights.id} NOT IN (${sql.join(existingIds.map(id => sql`${id}::uuid`), sql`, `)})`
              : sql`TRUE`
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(needed);

      selectedHighlights = [...selectedHighlights, ...randomHighlights];
    }

    // Skip if no highlights
    if (selectedHighlights.length === 0) {
      console.log(`📬 [Digest] No highlights for ${userEmail}, skipping`);
      return;
    }

    // 4. Get stats for the email template
    const [statsResult] = await db
      .select({
        totalHighlights: sql<number>`count(*)`,
      })
      .from(highlights)
      .where(
        and(
          eq(highlights.userId, userId),
          isNull(highlights.deletedAt)
        )
      );

    const [dueCountResult] = await db
      .select({
        dueCount: sql<number>`count(*)`,
      })
      .from(highlights)
      .where(
        and(
          eq(highlights.userId, userId),
          isNull(highlights.deletedAt),
          sql`(fsrs_card->>'due')::timestamp <= ${now.toISOString()}::timestamp`
        )
      );

    const totalHighlights = Number(statsResult?.totalHighlights ?? 0);
    const totalDue = Number(dueCountResult?.dueCount ?? 0);

    // 5. Render email
    const appUrl = process.env.APP_URL || "http://localhost:3002";
    const html = await render(
      DailyDigestEmail({
        highlights: selectedHighlights.map(h => ({
          id: h.id,
          content: h.content,
          bookTitle: h.bookTitle,
          bookAuthor: h.bookAuthor || undefined,
        })),
        appUrl: `${appUrl}/library`,
        unsubscribeUrl: `${appUrl}/settings/notifications`,
        totalHighlights,
        totalDue,
      })
    );

    // 6. Enqueue email
    await jobQueueService.enqueueEmail(
      userEmail,
      `📚 Your Daily Highlights — ${selectedHighlights.length} to review`,
      html
    );

    // 7. Update lastDigestSentAt for dedup
    await db
      .update(users)
      .set({ lastDigestSentAt: now })
      .where(eq(users.id, userId));

    console.log(`📬 [Digest] Queued digest for ${userEmail} with ${selectedHighlights.length} highlights`);
  }

  /**
   * Manually trigger digest generation (for testing / admin).
   * Bypasses timezone and frequency checks — sends to all enabled users.
   */
  async triggerNow(): Promise<void> {
    console.log("📬 [Digest] Manual trigger — sending to all enabled users...");

    const eligibleUsers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(ne(users.digestEnabled, "false"));

    console.log(`📬 [Digest] Manual trigger for ${eligibleUsers.length} user(s)`);

    for (const user of eligibleUsers) {
      try {
        await this.generateDigestForUser(user.id, user.email);
      } catch (error) {
        console.error(`📬 [Digest] Error generating digest for ${user.email}:`, error);
      }
    }
  }
}

export const digestService = new DigestService();
