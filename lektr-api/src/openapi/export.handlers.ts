import { OpenAPIHono } from "@hono/zod-openapi";
import { exportService } from "../services/export";
import { authMiddleware } from "../middleware/auth";
import { listExportProvidersRoute, triggerExportRoute } from "./export.routes";

export const exportOpenAPI = new OpenAPIHono();

// GET /providers - List available export providers (public)
exportOpenAPI.openapi(listExportProvidersRoute, async (c) => {
  const providers = exportService.getProviders().map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    outputType: "file" as const, // Default, actual type varies by provider
  }));
  return c.json({ providers }, 200);
});

// Protected routes
const protectedExport = new OpenAPIHono();
protectedExport.use("*", authMiddleware);

// POST /:providerId - Trigger export (auth required)
protectedExport.openapi(triggerExportRoute, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { providerId } = c.req.valid("param");
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
      return c.json({ redirect: result.url }, 200);
    }

    // JSON response (status message)
    return c.json({ message: result.message || "Export completed" }, 200);
  } catch (error) {
    console.error("[Export] Error:", error);
    const message = error instanceof Error ? error.message : "Export failed";
    return c.json({ error: message }, 500);
  }
});

// Mount protected routes
exportOpenAPI.route("/", protectedExport);
