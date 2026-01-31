import { Hono } from "hono";
import { readFile } from "fs/promises";
import { getCoverPath, coverExists } from "../services/covers";

const covers = new Hono();

/**
 * GET /api/v1/covers/:filename
 * Serve cover images from local storage
 */
covers.get("/:filename", async (c) => {
  const filename = c.req.param("filename");
  
  if (!coverExists(filename)) {
    return c.json({ error: "Cover not found" }, 404);
  }

  try {
    const filepath = getCoverPath(filename);
    const data = await readFile(filepath);
    
    // Determine content type from extension
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : 
                        ext === 'webp' ? 'image/webp' : 'image/jpeg';
    
    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error("Failed to serve cover:", error);
    return c.json({ error: "Failed to serve cover" }, 500);
  }
});

export { covers };
