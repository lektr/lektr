import { createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema } from "./schemas";

// ============================================
// Admin Schemas
// ============================================

const EmailSettingsResponseSchema = z.object({
  settings: z.record(z.string()),
  isConfigured: z.boolean(),
  envFallback: z.boolean(),
}).openapi("EmailSettingsResponse");

const EmailSettingsRequestSchema = z.object({
  smtp_host: z.string().optional(),
  smtp_port: z.string().optional(),
  smtp_user: z.string().optional(),
  smtp_pass: z.string().optional(),
  smtp_secure: z.string().optional(),
  mail_from_name: z.string().optional(),
  mail_from_email: z.string().optional(),
}).openapi("EmailSettingsRequest");

const TestEmailRequestSchema = z.object({
  email: z.string().email(),
}).openapi("TestEmailRequest");

const JobQueueStatusSchema = z.object({
  pending: z.number(),
  processing: z.number(),
  completed: z.number(),
  failed: z.number(),
}).openapi("JobQueueStatus");

const MetadataRefreshResponseSchema = z.object({
  queued: z.number(),
  message: z.string(),
}).openapi("MetadataRefreshResponse");

const SingleRefreshResponseSchema = z.object({
  success: z.boolean(),
  coverImageUrl: z.string().optional(),
  message: z.string(),
}).openapi("SingleRefreshResponse");

const SuccessMessageSchema = z.object({
  success: z.boolean(),
  message: z.string(),
}).openapi("SuccessMessage");

// ============================================
// Admin Routes
// ============================================

export const getEmailSettingsRoute = createRoute({
  method: "get",
  path: "/email-settings",
  tags: ["Admin"],
  summary: "Get email settings",
  description: "Get current SMTP email configuration (admin only)",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Email settings",
      content: {
        "application/json": {
          schema: EmailSettingsResponseSchema,
        },
      },
    },
    403: {
      description: "Admin access required",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const updateEmailSettingsRoute = createRoute({
  method: "put",
  path: "/email-settings",
  tags: ["Admin"],
  summary: "Update email settings",
  description: "Update SMTP email configuration (admin only)",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: EmailSettingsRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Settings updated",
      content: { "application/json": { schema: SuccessMessageSchema } },
    },
    403: {
      description: "Admin access required",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const testEmailRoute = createRoute({
  method: "post",
  path: "/email-settings/test",
  tags: ["Admin"],
  summary: "Send test email",
  description: "Send a test email to verify SMTP configuration (admin only)",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: TestEmailRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Test email sent",
      content: { "application/json": { schema: SuccessMessageSchema } },
    },
    400: {
      description: "Connection failed or missing email",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "Admin access required",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const getJobQueueStatusRoute = createRoute({
  method: "get",
  path: "/job-queue/status",
  tags: ["Admin"],
  summary: "Get job queue status",
  description: "Get background job queue status (admin only)",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Job queue status",
      content: { "application/json": { schema: JobQueueStatusSchema } },
    },
    403: {
      description: "Admin access required",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const refreshAllMetadataRoute = createRoute({
  method: "post",
  path: "/refresh-metadata",
  tags: ["Admin"],
  summary: "Refresh all book metadata",
  description: "Queue metadata refresh for all books without covers (admin only)",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Books queued for refresh",
      content: { "application/json": { schema: MetadataRefreshResponseSchema } },
    },
    400: {
      description: "No metadata providers configured",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "Admin access required",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const refreshBookMetadataRoute = createRoute({
  method: "post",
  path: "/refresh-metadata/{bookId}",
  tags: ["Admin"],
  summary: "Refresh single book metadata",
  description: "Refresh metadata for a specific book (owner only)",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      bookId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: "Metadata refreshed",
      content: { "application/json": { schema: SingleRefreshResponseSchema } },
    },
    400: {
      description: "No metadata providers configured",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "Not authorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
    404: {
      description: "Book not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const triggerDigestRoute = createRoute({
  method: "post",
  path: "/trigger-digest",
  tags: ["Admin"],
  summary: "Trigger digest emails",
  description: "Manually trigger digest email generation for all users (admin only)",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Digest triggered",
      content: { "application/json": { schema: SuccessMessageSchema } },
    },
    400: {
      description: "Email not configured",
      content: { "application/json": { schema: ErrorSchema } },
    },
    403: {
      description: "Admin access required",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});
