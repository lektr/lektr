import { createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema } from "./schemas";

// ============================================
// Covers Routes
// ============================================

export const getCoverRoute = createRoute({
  method: "get",
  path: "/{filename}",
  tags: ["Covers"],
  summary: "Serve cover image",
  description: "Serve a book cover image from local storage",
  request: {
    params: z.object({
      filename: z.string().openapi({ description: "Cover image filename" }),
    }),
  },
  responses: {
    200: {
      description: "Cover image binary",
      content: {
        "image/jpeg": {
          schema: z.any(),
        },
        "image/png": {
          schema: z.any(),
        },
        "image/webp": {
          schema: z.any(),
        },
      },
    },
    404: {
      description: "Cover not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});
