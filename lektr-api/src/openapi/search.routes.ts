import { createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema, TagSchema } from "./schemas";

// ============================================
// Search Schemas
// ============================================

const SearchResultSchema = z.object({
  id: z.string(),
  content: z.string(),
  chapter: z.string().nullable(),
  page: z.number().nullable(),
  bookId: z.string(),
  bookTitle: z.string(),
  bookAuthor: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  similarity: z.number(),
  tags: z.array(TagSchema),
  tagBoost: z.boolean(),
}).openapi("SearchResult");

const SearchResponseSchema = z.object({
  query: z.string(),
  filterTagIds: z.array(z.string()),
  results: z.array(SearchResultSchema),
  relatedTags: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable(),
    count: z.number(),
  })),
}).openapi("SearchResponse");

const EmbeddingStatusSchema = z.object({
  embeddings: z.object({
    complete: z.number(),
    pending: z.number(),
  }),
  queue: z.any(),
  modelLoaded: z.boolean(),
}).openapi("EmbeddingStatus");

// ============================================
// Route Definitions
// ============================================

export const searchRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Search"],
  summary: "Semantic search",
  description: "Search highlights using semantic similarity. Supports optional tag filtering.",
  security: [{ cookieAuth: [] }],
  request: {
    query: z.object({
      q: z.string().min(1).openapi({ description: "Search query", example: "machine learning" }),
      tagIds: z.string().optional().openapi({ description: "Comma-separated tag UUIDs to filter by" }),
      limit: z.string().optional().openapi({ description: "Max results (default 10, max 50)" }),
    }),
  },
  responses: {
    200: {
      description: "Search results with similarity scores",
      content: { "application/json": { schema: SearchResponseSchema } },
    },
    400: {
      description: "Missing query",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const generateEmbeddingsRoute = createRoute({
  method: "post",
  path: "/generate-embeddings",
  tags: ["Search"],
  summary: "Generate embeddings",
  description: "Queue highlights without embeddings for embedding generation.",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Highlights queued",
      content: { "application/json": { schema: z.object({
        message: z.string(),
        queued: z.number(),
      }) } },
    },
  },
});

export const getEmbeddingStatusRoute = createRoute({
  method: "get",
  path: "/status",
  tags: ["Search"],
  summary: "Get embedding status",
  description: "Get status of embedding generation and model loading.",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Embedding status",
      content: { "application/json": { schema: EmbeddingStatusSchema } },
    },
  },
});
