import { createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema } from "./schemas";

// ============================================
// Settings Schemas
// ============================================

const SettingValueSchema = z.object({
  value: z.string(),
  description: z.string().nullable(),
}).openapi("SettingValue");

const SettingsMapSchema = z.record(SettingValueSchema).openapi("SettingsMap");

const UpdateSettingsRequestSchema = z.object({
  settings: z.record(z.string()),
}).openapi("UpdateSettingsRequest");

const CheckReductionResponseSchema = z.object({
  affectedCount: z.number(),
  newLimit: z.number(),
}).openapi("CheckReductionResponse");

// ============================================
// Settings Routes
// ============================================

export const getSettingsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Settings"],
  summary: "Get all settings",
  description: "Get all application settings (public, no auth required)",
  responses: {
    200: {
      description: "Settings object",
      content: {
        "application/json": {
          schema: z.object({ settings: SettingsMapSchema }),
        },
      },
    },
  },
});

export const updateSettingsRoute = createRoute({
  method: "patch",
  path: "/",
  tags: ["Settings"],
  summary: "Update settings",
  description: "Update one or more settings (admin only)",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: UpdateSettingsRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Settings updated",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Invalid settings",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    403: {
      description: "Admin access required",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const checkReductionRoute = createRoute({
  method: "get",
  path: "/check-reduction",
  tags: ["Settings"],
  summary: "Check highlight reduction impact",
  description: "Check how many highlights would be affected by a length reduction",
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      limit: z.string().openapi({ description: "New max length to check" }),
    }),
  },
  responses: {
    200: {
      description: "Affected count",
      content: {
        "application/json": {
          schema: CheckReductionResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid limit",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});
