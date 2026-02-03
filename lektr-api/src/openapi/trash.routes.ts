import { createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema, TagSchema } from "./schemas";

// ============================================
// Trash Schemas
// ============================================

const DeletedHighlightSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  bookTitle: z.string(),
  bookAuthor: z.string().nullable(),
  content: z.string(),
  note: z.string().nullable(),
  chapter: z.string().nullable(),
  page: z.number().nullable(),
  deletedAt: z.string(),
  highlightedAt: z.string().nullable(),
}).openapi("DeletedHighlight");

const TrashListResponseSchema = z.object({
  highlights: z.array(DeletedHighlightSchema),
}).openapi("TrashListResponse");

// ============================================
// Route Definitions
// ============================================

export const listTrashRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Trash"],
  summary: "List deleted highlights",
  description: "Get all soft-deleted highlights for the authenticated user.",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "List of deleted highlights",
      content: { "application/json": { schema: TrashListResponseSchema } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});
