import { createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema, TagSchema } from "./schemas";

// ============================================
// Rediscovery Schemas
// ============================================

const RediscoveryHighlightSchema = z
  .object({
    id: z.string(),
    content: z.string(),
    note: z.string().nullable(),
    chapter: z.string().nullable(),
    page: z.number().nullable(),
    highlightedAt: z.string().nullable(),
    bookId: z.string(),
    bookTitle: z.string(),
    bookAuthor: z.string().nullable(),
    coverImageUrl: z.string().nullable(),
    tags: z.array(TagSchema),
  })
  .openapi("RediscoveryHighlight");

const RediscoveryResponseSchema = z
  .object({
    highlights: z.array(RediscoveryHighlightSchema),
  })
  .openapi("RediscoveryResponse");

// ============================================
// Rediscovery Routes
// ============================================

export const getRediscoveryRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Rediscovery"],
  summary: "Get random highlights for rediscovery",
  description:
    "Returns a set of random highlights from the user's library for passive resurfacing. Think 'On This Day' or Readwise's Daily Review.",
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      count: z
        .string()
        .optional()
        .openapi({
          description: "Number of random highlights to return (1-20, default 5)",
          example: "5",
        }),
    }),
  },
  responses: {
    200: {
      description: "Random highlights for rediscovery",
      content: {
        "application/json": {
          schema: RediscoveryResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});
