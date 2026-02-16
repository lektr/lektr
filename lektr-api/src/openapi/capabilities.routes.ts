import { createRoute, z } from "@hono/zod-openapi";

// ============================================
// Capabilities Schemas
// ============================================

export const CapabilitiesSchema = z
  .object({
    cloud: z.boolean().openapi({ example: false }),
    billing: z.boolean().openapi({ example: false }),
    teams: z.boolean().openapi({ example: false }),
    sso: z.boolean().openapi({ example: false }),
  })
  .openapi("Capabilities");

// ============================================
// Capabilities Routes
// ============================================

export const getCapabilitiesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Capabilities"],
  summary: "Get instance capabilities",
  description:
    "Returns which features are available on this instance. " +
    "Self-hosted instances return a static set of capabilities. " +
    "Cloud-hosted instances may advertise additional features.",
  responses: {
    200: {
      description: "Instance capabilities",
      content: {
        "application/json": {
          schema: CapabilitiesSchema,
        },
      },
    },
  },
});
