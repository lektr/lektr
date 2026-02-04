import { createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema, TagSchema } from "./schemas";

// ============================================
// Books Schemas
// ============================================

const BookSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string().nullable(),
  sourceType: z.string(),
  coverImageUrl: z.string().nullable(),
  highlightCount: z.number(),
  lastHighlightedAt: z.string().nullable(),
  pinnedAt: z.string().nullable(),
  createdAt: z.string(),
  tags: z.array(TagSchema),
}).openapi("BookSummary");

const HighlightSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  content: z.string(),
  note: z.string().nullable(),
  chapter: z.string().nullable(),
  page: z.number().nullable(),
  positionPercent: z.number().nullable(),
  highlightedAt: z.string().nullable(),
  createdAt: z.string(),
  tags: z.array(TagSchema),
}).openapi("Highlight");

const BookDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string().nullable(),
  sourceType: z.string(),
  coverImageUrl: z.string().nullable(),
  metadata: z.any().nullable(),
  createdAt: z.string(),
  tags: z.array(TagSchema),
}).openapi("BookDetail");

const BooksListResponseSchema = z.object({
  books: z.array(BookSummarySchema),
}).openapi("BooksListResponse");

const BookWithHighlightsResponseSchema = z.object({
  book: BookDetailSchema,
  highlights: z.array(HighlightSchema),
}).openapi("BookWithHighlightsResponse");

const UpdateBookRequestSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
}).openapi("UpdateBookRequest");

const UpdateMetadataRequestSchema = z.object({
  coverImageUrl: z.string().optional(),
  description: z.string().optional(),
  pageCount: z.number().optional(),
  publishedDate: z.string().optional(),
  genres: z.array(z.string()).optional(),
}).openapi("UpdateMetadataRequest");

const UpdateHighlightRequestSchema = z.object({
  content: z.string().optional(),
  note: z.string().nullable().optional(),
}).openapi("UpdateHighlightRequest");

const SuccessResponseSchema = z.object({
  success: z.boolean(),
  bookId: z.string().optional(),
  highlightId: z.string().optional(),
  message: z.string().optional(),
}).openapi("SuccessResponse");

// ============================================
// Route Definitions
// ============================================

export const listBooksRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Books"],
  summary: "List all books",
  description: "Get all books for the authenticated user with highlight counts and tags.",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "List of books",
      content: { "application/json": { schema: BooksListResponseSchema } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const getBookRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Books"],
  summary: "Get book details",
  description: "Get a single book with all its highlights and tags.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ example: "abc123" }) }),
    query: z.object({
      includeDeleted: z.string().optional().openapi({ param: { description: "Include soft-deleted highlights", example: "true" } }),
    }),
  },
  responses: {
    200: {
      description: "Book with highlights",
      content: { "application/json": { schema: BookWithHighlightsResponseSchema } },
    },
    404: {
      description: "Book not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "Not authorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const updateBookRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Books"],
  summary: "Update book",
  description: "Update a book's title and/or author.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: UpdateBookRequestSchema } } },
  },
  responses: {
    200: {
      description: "Book updated",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
    404: {
      description: "Book not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "Not authorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const updateMetadataRoute = createRoute({
  method: "patch",
  path: "/{id}/metadata",
  tags: ["Books"],
  summary: "Update book metadata",
  description: "Apply metadata updates (cover, description, genres, etc.) to a book.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: UpdateMetadataRequestSchema } } },
  },
  responses: {
    200: {
      description: "Metadata updated",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
    404: {
      description: "Book not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "Not authorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const updateHighlightRoute = createRoute({
  method: "patch",
  path: "/{bookId}/highlights/{highlightId}",
  tags: ["Highlights"],
  summary: "Update highlight",
  description: "Update a highlight's content and/or note.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      bookId: z.string(),
      highlightId: z.string(),
    }),
    body: { content: { "application/json": { schema: UpdateHighlightRequestSchema } } },
  },
  responses: {
    200: {
      description: "Highlight updated",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
    400: {
      description: "Validation error or highlight doesn't belong to book",
      content: { "application/json": { schema: ErrorSchema } },
    },
    404: {
      description: "Book or highlight not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "Not authorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const deleteBookRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Books"],
  summary: "Delete book",
  description: "Delete a book and all its highlights.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Book deleted",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
    404: {
      description: "Book not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "Not authorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const deleteHighlightRoute = createRoute({
  method: "delete",
  path: "/{bookId}/highlights/{highlightId}",
  tags: ["Highlights"],
  summary: "Delete highlight",
  description: "Delete a single highlight from a book.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      bookId: z.string(),
      highlightId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Highlight deleted",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
    400: {
      description: "Highlight doesn't belong to book",
      content: { "application/json": { schema: ErrorSchema } },
    },
    404: {
      description: "Book or highlight not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "Not authorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

// Pin/Unpin Book Route
export const togglePinRoute = createRoute({
  method: "post",
  path: "/{id}/pin",
  tags: ["Books"],
  summary: "Toggle book pin status",
  description: "Pin or unpin a book. Pinned books appear at the top of the library.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Pin status toggled",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            pinned: z.boolean(),
            pinnedAt: z.string().nullable(),
          }),
        },
      },
    },
    404: {
      description: "Book not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "Not authorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

// Restore Highlight Route (undo soft delete)
export const restoreHighlightRoute = createRoute({
  method: "patch",
  path: "/highlights/{highlightId}/restore",
  tags: ["Highlights"],
  summary: "Restore deleted highlight",
  description: "Restore a soft-deleted highlight back to active state.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      highlightId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Highlight restored",
      content: { "application/json": { schema: SuccessResponseSchema } },
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

// Hard Delete Highlight Route (permanent deletion)
export const hardDeleteHighlightRoute = createRoute({
  method: "delete",
  path: "/highlights/{highlightId}/permanent",
  tags: ["Highlights"],
  summary: "Permanently delete highlight",
  description: "Permanently delete a highlight. This action cannot be undone.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({
      highlightId: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Highlight permanently deleted",
      content: { "application/json": { schema: SuccessResponseSchema } },
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

// ============================================
// Book Study Routes
// ============================================

// Study Item Schema (reused from decks for consistency)
const StudyItemSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  cardType: z.enum(["basic", "cloze"]),
  isVirtual: z.boolean(),
  highlightId: z.string().nullable(),
  deckId: z.string().nullable(),
  highlight: z.object({
    id: z.string(),
    bookId: z.string(),
    bookTitle: z.string(),
  }).nullable(),
}).openapi("BookStudyItem");

export const getBookStudySessionRoute = createRoute({
  method: "get",
  path: "/{id}/study",
  tags: ["Books", "Study"],
  summary: "Get book study session",
  description: "Get a study session with due flashcards linked to this book's highlights, plus virtual cards from raw highlights.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({ limit: z.string().optional() }),
  },
  responses: {
    200: {
      description: "Study session cards",
      content: {
        "application/json": {
          schema: z.object({
            cards: z.array(StudyItemSchema),
            totalDue: z.number(),
            totalHighlights: z.number(),
          }),
        },
      },
    },
    404: {
      description: "Book not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const getBookStudyStatsRoute = createRoute({
  method: "get",
  path: "/{id}/study-stats",
  tags: ["Books", "Study"],
  summary: "Get book study stats",
  description: "Get study statistics for a book (due card count, total highlights) for UI display.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Study stats",
      content: {
        "application/json": {
          schema: z.object({
            dueCount: z.number(),
            cardCount: z.number(),
            highlightCount: z.number(),
          }),
        },
      },
    },
    404: {
      description: "Book not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});
