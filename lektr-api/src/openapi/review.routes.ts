import { createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema } from "./schemas";

// ============================================
// Review Schemas
// ============================================

const ReviewItemSchema = z.object({
  id: z.string(),
  content: z.string(),
  note: z.string().nullable(),
  chapter: z.string().nullable(),
  page: z.number().nullable(),
  bookId: z.string(),
  book: z.object({
    title: z.string(),
    author: z.string().nullable(),
  }),
  fsrsCard: z.any().nullable(),
}).openapi("ReviewItem");

const ReviewQueueResponseSchema = z.object({
  items: z.array(ReviewItemSchema),
  total: z.number(),
  completed: z.number(),
}).openapi("ReviewQueueResponse");

const RatingRequestSchema = z.object({
  rating: z.enum(["again", "hard", "good", "easy"]),
}).openapi("RatingRequest");

const RatingResponseSchema = z.object({
  success: z.boolean(),
  nextReview: z.string(),
  interval: z.string(),
  state: z.string(),
}).openapi("RatingResponse");

const ReviewStatsSchema = z.object({
  new: z.number(),
  due: z.number(),
  learning: z.number(),
  review: z.number(),
  total: z.number(),
}).openapi("ReviewStats");

// ============================================
// Route Definitions
// ============================================

export const getReviewQueueRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Review"],
  summary: "Get review queue",
  description: "Get today's review queue (Daily 5 highlights due for review).",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Review queue",
      content: { "application/json": { schema: ReviewQueueResponseSchema } },
    },
  },
});

export const submitReviewRoute = createRoute({
  method: "post",
  path: "/{id}",
  tags: ["Review"],
  summary: "Submit review rating",
  description: "Submit a rating for a highlight using FSRS spaced repetition.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: RatingRequestSchema } } },
  },
  responses: {
    200: {
      description: "Review submitted",
      content: { "application/json": { schema: RatingResponseSchema } },
    },
    404: {
      description: "Highlight not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "Not authorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const getReviewStatsRoute = createRoute({
  method: "get",
  path: "/stats",
  tags: ["Review"],
  summary: "Get review statistics",
  description: "Get review statistics for the authenticated user.",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Review statistics",
      content: { "application/json": { schema: ReviewStatsSchema } },
    },
  },
});
