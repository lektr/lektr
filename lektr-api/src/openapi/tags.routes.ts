import { createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema, TagSchema } from "./schemas";

// ============================================
// Tags Schemas
// ============================================

const TagWithUsageSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  userId: z.string(),
  createdAt: z.string(),
}).openapi("TagWithUsage");

const CreateTagRequestSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(100).nullable().optional(),
}).openapi("CreateTagRequest");

const UpdateTagRequestSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().max(100).nullable().optional(),
}).openapi("UpdateTagRequest");

const SuccessSchema = z.object({ success: z.boolean() }).openapi("Success");

// ============================================
// Route Definitions
// ============================================

export const listTagsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Tags"],
  summary: "List all tags",
  description: "Get all tags for the authenticated user.",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "List of tags with default colors",
      content: { "application/json": { schema: z.object({
        tags: z.array(TagWithUsageSchema),
        defaultColors: z.array(z.string()),
      }) } },
    },
  },
});

export const createTagRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Tags"],
  summary: "Create a tag",
  description: "Create a new tag for the authenticated user.",
  security: [{ cookieAuth: [] }],
  request: { body: { content: { "application/json": { schema: CreateTagRequestSchema } } } },
  responses: {
    201: { description: "Tag created", content: { "application/json": { schema: z.object({ tag: TagWithUsageSchema }) } } },
    400: { description: "Tag already exists", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const getTagRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Tags"],
  summary: "Get tag details",
  description: "Get a tag with all associated books and highlights.",
  security: [{ cookieAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Tag with books and highlights", content: { "application/json": { schema: z.object({
      tag: TagWithUsageSchema,
      books: z.array(z.any()),
      highlights: z.array(z.any()),
    }) } } },
    404: { description: "Tag not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const updateTagRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Tags"],
  summary: "Update a tag",
  description: "Update a tag's name and/or color.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: UpdateTagRequestSchema } } },
  },
  responses: {
    200: { description: "Tag updated", content: { "application/json": { schema: z.object({ tag: TagWithUsageSchema }) } } },
    400: { description: "Tag name already exists", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Tag not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const deleteTagRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Tags"],
  summary: "Delete a tag",
  description: "Delete a tag (also removes from all highlights and books).",
  security: [{ cookieAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Tag deleted", content: { "application/json": { schema: SuccessSchema } } },
    404: { description: "Tag not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const addTagToHighlightRoute = createRoute({
  method: "post",
  path: "/{id}/highlights/{highlightId}",
  tags: ["Tags"],
  summary: "Add tag to highlight",
  description: "Add a tag to a specific highlight.",
  security: [{ cookieAuth: [] }],
  request: { params: z.object({ id: z.string(), highlightId: z.string() }) },
  responses: {
    201: { description: "Tag added", content: { "application/json": { schema: SuccessSchema } } },
    404: { description: "Tag or highlight not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const removeTagFromHighlightRoute = createRoute({
  method: "delete",
  path: "/{id}/highlights/{highlightId}",
  tags: ["Tags"],
  summary: "Remove tag from highlight",
  description: "Remove a tag from a highlight.",
  security: [{ cookieAuth: [] }],
  request: { params: z.object({ id: z.string(), highlightId: z.string() }) },
  responses: {
    200: { description: "Tag removed", content: { "application/json": { schema: SuccessSchema } } },
    404: { description: "Tag not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const getHighlightsByTagRoute = createRoute({
  method: "get",
  path: "/{id}/highlights",
  tags: ["Tags"],
  summary: "Get highlights by tag",
  description: "Get all highlights with a specific tag.",
  security: [{ cookieAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Tag with highlights", content: { "application/json": { schema: z.object({
      tag: TagWithUsageSchema,
      highlights: z.array(z.any()),
    }) } } },
    404: { description: "Tag not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const addTagToBookRoute = createRoute({
  method: "post",
  path: "/{id}/books/{bookId}",
  tags: ["Tags"],
  summary: "Add tag to book",
  description: "Add a tag to a specific book.",
  security: [{ cookieAuth: [] }],
  request: { params: z.object({ id: z.string(), bookId: z.string() }) },
  responses: {
    201: { description: "Tag added", content: { "application/json": { schema: SuccessSchema } } },
    404: { description: "Tag or book not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const removeTagFromBookRoute = createRoute({
  method: "delete",
  path: "/{id}/books/{bookId}",
  tags: ["Tags"],
  summary: "Remove tag from book",
  description: "Remove a tag from a book.",
  security: [{ cookieAuth: [] }],
  request: { params: z.object({ id: z.string(), bookId: z.string() }) },
  responses: {
    200: { description: "Tag removed", content: { "application/json": { schema: SuccessSchema } } },
    404: { description: "Tag not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const getBooksByTagRoute = createRoute({
  method: "get",
  path: "/{id}/books",
  tags: ["Tags"],
  summary: "Get books by tag",
  description: "Get all books with a specific tag.",
  security: [{ cookieAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Tag with books", content: { "application/json": { schema: z.object({
      tag: TagWithUsageSchema,
      books: z.array(z.any()),
    }) } } },
    404: { description: "Tag not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});
