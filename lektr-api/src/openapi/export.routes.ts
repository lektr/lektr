import { createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema } from "./schemas";

// ============================================
// Export Schemas
// ============================================

const ExportProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  outputType: z.enum(["file", "url", "api"]),
}).openapi("ExportProvider");

const ExportRequestSchema = z.object({
  bookIds: z.array(z.string().uuid()).optional(),
  includeNotes: z.boolean().optional().default(true),
  includeTags: z.boolean().optional().default(true),
  config: z.record(z.unknown()).optional(),
}).openapi("ExportRequest");

// ============================================
// Export Routes
// ============================================

export const listExportProvidersRoute = createRoute({
  method: "get",
  path: "/providers",
  tags: ["Export"],
  summary: "List export providers",
  description: "Get all available export providers (Markdown, Obsidian, Readwise, Notion)",
  responses: {
    200: {
      description: "List of providers",
      content: {
        "application/json": {
          schema: z.object({
            providers: z.array(ExportProviderSchema),
          }),
        },
      },
    },
  },
});

export const triggerExportRoute = createRoute({
  method: "post",
  path: "/{providerId}",
  tags: ["Export"],
  summary: "Trigger export",
  description: "Export highlights using a specific provider",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      providerId: z.string().openapi({ description: "Export provider ID" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: ExportRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Export result (file download, redirect URL, or status message)",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string().optional(),
            redirect: z.string().optional(),
          }),
        },
        "application/octet-stream": {
          schema: z.any(),
        },
      },
    },
    404: {
      description: "Provider not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Export failed",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});
