import { createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema } from "./schemas";

// ============================================
// Digest Settings Schemas
// ============================================

const DigestPreferencesSchema = z.object({
  digestEnabled: z.boolean(),
  digestFrequency: z.enum(["daily", "weekdays", "weekly"]),
  digestHour: z.number().min(0).max(23),
  digestTimezone: z.string(),
}).openapi("DigestPreferences");

const UpdateDigestPreferencesSchema = z.object({
  digestEnabled: z.boolean().optional(),
  digestFrequency: z.enum(["daily", "weekdays", "weekly"]).optional(),
  digestHour: z.number().min(0).max(23).optional(),
  digestTimezone: z.string().optional(),
}).openapi("UpdateDigestPreferences");

// ============================================
// Digest Routes
// ============================================

export const getDigestPreferencesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Digest"],
  summary: "Get digest preferences",
  description: "Get the current user's digest email preferences",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Digest preferences",
      content: {
        "application/json": {
          schema: DigestPreferencesSchema,
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

export const updateDigestPreferencesRoute = createRoute({
  method: "patch",
  path: "/",
  tags: ["Digest"],
  summary: "Update digest preferences",
  description: "Update the current user's digest email preferences",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: UpdateDigestPreferencesSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Preferences updated",
      content: {
        "application/json": {
          schema: DigestPreferencesSchema,
        },
      },
    },
    400: {
      description: "Invalid preferences",
      content: {
        "application/json": {
          schema: ErrorSchema,
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
