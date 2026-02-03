import { createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema } from "./schemas";

// ============================================
// Import Schemas
// ============================================

const PendingMetadataUpdateSchema = z.object({
  bookId: z.string(),
  bookTitle: z.string(),
  current: z.object({
    coverImageUrl: z.string().nullable().optional(),
    description: z.string().optional(),
  }),
  available: z.object({
    coverImageUrl: z.string().optional(),
    description: z.string().optional(),
    pageCount: z.number().optional(),
    publishedDate: z.string().optional(),
    genres: z.array(z.string()).optional(),
  }),
}).openapi("PendingMetadataUpdate");

const BookBreakdownSchema = z.object({
  bookId: z.string(),
  title: z.string(),
  highlightCount: z.number(),
}).openapi("BookBreakdown");

const ImportResultSchema = z.object({
  source: z.string(),
  booksImported: z.number(),
  highlightsImported: z.number(),
  highlightsSkipped: z.number(),
  highlightsTruncated: z.number().optional(),
  syncHistoryId: z.string(),
  pendingUpdates: z.array(PendingMetadataUpdateSchema).optional(),
  bookBreakdown: z.array(BookBreakdownSchema).optional(),
}).openapi("ImportResult");

// ============================================
// Route Definitions
// ============================================

export const importRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Import"],
  summary: "Import highlights",
  description: "Import highlights from Kindle (.txt) or KOReader (.json/.lua) files.",
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.any().openapi({ description: "Highlight file to import" }),
            source: z.enum(["kindle", "koreader", "readwise", "lektr"]).openapi({ description: "Import source type" }),
          }),
        },
        "application/json": {
          schema: z.object({
            source: z.enum(["kindle", "koreader", "readwise", "lektr"]),
            data: z.record(z.any()).openapi({ description: "JSON export data from device" }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Import successful",
      content: { "application/json": { schema: ImportResultSchema } },
    },
    400: {
      description: "Invalid file or source",
      content: { "application/json": { schema: ErrorSchema } },
    },
    500: {
      description: "Import failed",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});
