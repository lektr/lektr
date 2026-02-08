import { OpenAPIHono } from "@hono/zod-openapi";
import { readFile } from "fs/promises";
import { getCoverPath, coverExists } from "../services/covers";
import { getCoverRoute } from "./covers.routes";

export const coversOpenAPI = new OpenAPIHono();

// No auth required - covers are public assets

coversOpenAPI.openapi(getCoverRoute, async (c) => {
  const { filename } = c.req.valid("param");

  if (!coverExists(filename)) {
    return c.json({ error: "Cover not found" }, 404);
  }

  try {
    const filepath = getCoverPath(filename);
    const data = await readFile(filepath);

    // Determine content type from extension
    const ext = filename.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

    return c.body(data, 200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000", // Cache for 1 year
    }) as any;
  } catch (error) {
    console.error("Failed to serve cover:", error);
    return c.json({ error: "Failed to serve cover" }, 500);
  }
});
