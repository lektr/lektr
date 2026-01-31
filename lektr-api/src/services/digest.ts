/**
 * Digest Service
 * 
 * Generates and sends daily digest emails using spaced repetition (FSRS).
 */

import { render } from "@react-email/render";
import cron from "node-cron";
import { db } from "../db";
import { users, highlights, books } from "../db/schema";
import { eq, and, lte, isNull, sql, ne } from "drizzle-orm";
import { jobQueueService } from "./job-queue";
import DailyDigestEmail from "../emails/daily-digest";

const HIGHLIGHTS_PER_DIGEST = 5;

class DigestService {
  private cronJob: ReturnType<typeof cron.schedule> | null = null;

  /**
   * Start the daily digest cron job.
   * Runs at 8 AM every day by default.
   */
  start(cronExpression = "0 8 * * *"): void {
    if (this.cronJob) return;

    console.log(`📬 [Digest] Starting daily digest cron (${cronExpression})`);
    
    this.cronJob = cron.schedule(cronExpression, async () => {
      console.log("📬 [Digest] Running daily digest generation...");
      await this.generateDigestsForAllUsers();
    });
  }

  /**
   * Stop the cron job.
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log("📬 [Digest] Stopped daily digest cron");
    }
  }

  /**
   * Generate digest emails for all users with digest enabled.
   */
  async generateDigestsForAllUsers(): Promise<void> {
    const eligibleUsers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(ne(users.digestEnabled, "false"));

    console.log(`📬 [Digest] Generating digests for ${eligibleUsers.length} users`);

    for (const user of eligibleUsers) {
      try {
        await this.generateDigestForUser(user.id, user.email);
      } catch (error) {
        console.error(`📬 [Digest] Error generating digest for ${user.email}:`, error);
      }
    }
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

    // 4. Render email
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
      })
    );

    // 5. Enqueue email
    await jobQueueService.enqueueEmail(
      userEmail,
      "📚 Your Daily Highlights",
      html
    );

    console.log(`📬 [Digest] Queued digest for ${userEmail} with ${selectedHighlights.length} highlights`);
  }

  /**
   * Manually trigger digest generation (for testing).
   */
  async triggerNow(): Promise<void> {
    console.log("📬 [Digest] Manual trigger...");
    await this.generateDigestsForAllUsers();
  }
}

export const digestService = new DigestService();
