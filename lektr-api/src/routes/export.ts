import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { exportService } from "../services/export";
import { authMiddleware } from "../middleware/auth";

const exportRoutes = new Hono();

// List available export providers (public)
exportRoutes.get("/providers", (c) => {
  const providers = exportService.getProviders();
  return c.json({ providers });
});

// Trigger export (requires auth)
const exportSchema = z.object({
  bookIds: z.array(z.string().uuid()).optional(),
  includeNotes: z.boolean().optional().default(true),
  includeTags: z.boolean().optional().default(true),
  config: z.record(z.unknown()).optional(),
});

exportRoutes.post("/:providerId", authMiddleware, zValidator("json", exportSchema), async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const providerId = c.req.param("providerId");
  const body = c.req.valid("json");

  const provider = exportService.getProvider(providerId);
  if (!provider) {
    return c.json({ error: `Export provider not found: ${providerId}` }, 404);
  }

  try {
    const result = await exportService.export(providerId, {
      userId: user.userId,
      bookIds: body.bookIds,
      includeNotes: body.includeNotes,
      includeTags: body.includeTags,
      targetConfig: body.config,
    });

    if (result.type === "file" && result.data) {
      // Return file download
      c.header("Content-Type", result.contentType || "application/octet-stream");
      c.header("Content-Disposition", `attachment; filename="${result.filename || "export"}"`);
      return c.body(typeof result.data === "string" ? result.data : new Uint8Array(result.data));
    }

    if (result.type === "url" && result.url) {
      return c.json({ redirect: result.url });
    }

    // JSON response (status message)
    return c.json({ message: result.message || "Export completed" });
  } catch (error) {
    console.error("[Export] Error:", error);
    const message = error instanceof Error ? error.message : "Export failed";
    return c.json({ error: message }, 500);
  }
});

export { exportRoutes };
