import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../db";
import { highlights } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { FSRS, Rating, type Card, type SchedulingCards } from "@squeakyrobot/fsrs";
import {
  getReviewQueueRoute,
  submitReviewRoute,
  getReviewStatsRoute,
} from "./review.routes";

const fsrs = new FSRS({});

const ratingMap: Record<string, typeof Rating.Again | typeof Rating.Hard | typeof Rating.Good | typeof Rating.Easy> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export const reviewOpenAPI = new OpenAPIHono();
reviewOpenAPI.use("*", authMiddleware);

// GET / - Get review queue
reviewOpenAPI.openapi(getReviewQueueRoute, async (c) => {
  const user = c.get("user");
  const now = new Date();

  const dueHighlights = await db.execute(sql`
    SELECT 
      h.id, h.content, h.note, h.chapter, h.page, h.book_id, h.fsrs_card,
      b.title as book_title, b.author as book_author
    FROM highlights h
    JOIN books b ON h.book_id = b.id
    WHERE h.user_id = ${user.userId}
      AND (h.fsrs_card IS NULL OR (h.fsrs_card->>'due')::timestamp <= ${now.toISOString()}::timestamp)
    ORDER BY CASE WHEN h.fsrs_card IS NULL THEN 0 ELSE 1 END, (h.fsrs_card->>'due')::timestamp ASC NULLS FIRST
    LIMIT 5
  `);

  const rows = Array.isArray(dueHighlights) ? dueHighlights : (dueHighlights as any)?.rows || [];

  const reviewItems = rows.map((row: any) => ({
    id: row.id,
    content: row.content,
    note: row.note,
    chapter: row.chapter,
    page: row.page,
    bookId: row.book_id,
    book: { title: row.book_title || "Unknown", author: row.book_author },
    fsrsCard: row.fsrs_card,
  }));

  return c.json({ items: reviewItems, total: reviewItems.length, completed: 0 }, 200);
});

// POST /:id - Submit review rating
reviewOpenAPI.openapi(submitReviewRoute, async (c) => {
  const user = c.get("user");
  const { id: highlightId } = c.req.valid("param");
  const { rating } = c.req.valid("json");

  const [highlight] = await db.select().from(highlights)
    .where(eq(highlights.id, highlightId)).limit(1);

  if (!highlight) return c.json({ error: "Highlight not found" }, 404);
  if (highlight.userId !== user.userId) return c.json({ error: "Not authorized" }, 403);

  let card: Card;
  const existingCard = highlight.fsrsCard as any;
  
  if (existingCard && existingCard.state !== undefined) {
    card = {
      due: new Date(existingCard.due),
      stability: existingCard.stability,
      difficulty: existingCard.difficulty,
      elapsed_days: existingCard.elapsed_days,
      scheduled_days: existingCard.scheduled_days,
      reps: existingCard.reps,
      lapses: existingCard.lapses,
      state: existingCard.state,
      last_review: existingCard.last_review ? new Date(existingCard.last_review) : null,
    };
  } else {
    card = fsrs.createEmptyCard();
  }

  const now = new Date();
  const fsrsRating = ratingMap[rating];
  const schedulingCards: SchedulingCards = fsrs.repeat(card, now);
  const scheduledCard = schedulingCards[fsrsRating].card;

  const fsrsCardState = {
    due: scheduledCard.due.toISOString(),
    stability: scheduledCard.stability,
    difficulty: scheduledCard.difficulty,
    elapsed_days: scheduledCard.elapsed_days,
    scheduled_days: scheduledCard.scheduled_days,
    reps: scheduledCard.reps,
    lapses: scheduledCard.lapses,
    state: scheduledCard.state,
    last_review: now.toISOString(),
  };

  await db.update(highlights).set({ fsrsCard: fsrsCardState }).where(eq(highlights.id, highlightId));

  const intervalDays = Math.round(scheduledCard.scheduled_days);
  let intervalText: string;
  if (intervalDays === 0) {
    const minutes = Math.round((scheduledCard.due.getTime() - now.getTime()) / 60000);
    intervalText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (intervalDays < 30) {
    intervalText = `${intervalDays} day${intervalDays !== 1 ? 's' : ''}`;
  } else {
    const months = Math.round(intervalDays / 30);
    intervalText = `${months} month${months !== 1 ? 's' : ''}`;
  }

  const stateNames = ["New", "Learning", "Review", "Relearning"];
  const stateName = stateNames[scheduledCard.state] || "Unknown";

  return c.json({
    success: true,
    nextReview: scheduledCard.due.toISOString(),
    interval: intervalText,
    state: stateName,
  }, 200);
});

// GET /stats - Get review statistics
reviewOpenAPI.openapi(getReviewStatsRoute, async (c) => {
  const user = c.get("user");
  const now = new Date();

  const stats = await db.execute(sql`
    SELECT 
      COUNT(*) FILTER (WHERE fsrs_card IS NULL) as new_count,
      COUNT(*) FILTER (WHERE fsrs_card IS NOT NULL AND (fsrs_card->>'due')::timestamp <= ${now.toISOString()}::timestamp) as due_count,
      COUNT(*) FILTER (WHERE fsrs_card IS NOT NULL AND (fsrs_card->>'state')::int = 1) as learning_count,
      COUNT(*) FILTER (WHERE fsrs_card IS NOT NULL AND (fsrs_card->>'state')::int = 2) as review_count,
      COUNT(*) as total_count
    FROM highlights
    WHERE user_id = ${user.userId}
  `);

  const rows = Array.isArray(stats) ? stats : (stats as any)?.rows || [];
  const row = rows[0] || {};

  return c.json({
    new: parseInt(row.new_count) || 0,
    due: parseInt(row.due_count) || 0,
    learning: parseInt(row.learning_count) || 0,
    review: parseInt(row.review_count) || 0,
    total: parseInt(row.total_count) || 0,
  }, 200);
});
