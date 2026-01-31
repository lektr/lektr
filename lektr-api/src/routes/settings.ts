import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db";
import { settings, highlights } from "../db/schema";
import { eq, sql } from "drizzle-orm";

const settingsRouter = new Hono();

// Default settings (fallback if not in DB)
const DEFAULT_SETTINGS: Record<string, string> = {
  max_highlight_length: "5000",
  max_note_length: "1000",
  display_collapse_length: "500",
  theme_default: "auto", // "auto" | "dark" | "light"
  telemetry_enabled: "true",
};

/**
 * GET /api/v1/settings
 * Get all settings (public, no auth required for client to fetch limits)
 */
settingsRouter.get("/", async (c) => {
  const allSettings = await db.select().from(settings);
  
  // Merge with defaults for any missing keys
  const result: Record<string, { value: string; description: string | null }> = {};
  
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const found = allSettings.find((s) => s.key === key);
    result[key] = {
      value: found?.value ?? DEFAULT_SETTINGS[key],
      description: found?.description ?? null,
    };
  }
  
  // Include any extra settings from DB
  for (const setting of allSettings) {
    if (!result[setting.key]) {
      result[setting.key] = {
        value: setting.value,
        description: setting.description,
      };
    }
  }
  
  return c.json({ settings: result });
});

/**
 * GET /api/v1/settings/:key
 * Get a single setting value (used internally by other routes)
 */
export async function getSetting(key: string): Promise<string> {
  const [setting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  
  return setting?.value ?? DEFAULT_SETTINGS[key] ?? "";
}

/**
 * GET /api/v1/settings/check-reduction
 * Check how many highlights would be affected by a length reduction
 * Requires auth
 */
settingsRouter.get("/check-reduction", authMiddleware, async (c) => {
  const newLimit = parseInt(c.req.query("limit") || "0", 10);
  
  if (!newLimit || newLimit < 100) {
    return c.json({ error: "Invalid limit" }, 400);
  }
  
  // Count highlights that exceed the new limit
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(highlights)
    .where(sql`length(content) > ${newLimit}`);
  
  return c.json({ 
    affectedCount: Number(result?.count ?? 0),
    newLimit,
  });
});

/**
 * PATCH /api/v1/settings
 * Update one or more settings (admin only)
 */
settingsRouter.patch("/", authMiddleware, async (c) => {
  // SECURITY: Only admins can modify settings
  const user = c.get("user");
  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }
  
  try {
    const body = await c.req.json();
    const updates = body.settings as Record<string, string>;
    
    if (!updates || typeof updates !== "object") {
      return c.json({ error: "Invalid settings object" }, 400);
    }
    
    // Validate numeric settings
    const numericKeys = ["max_highlight_length", "max_note_length", "display_collapse_length"];
    for (const key of Object.keys(updates)) {
      if (numericKeys.includes(key)) {
        const value = parseInt(updates[key], 10);
        if (isNaN(value) || value < 100) {
          return c.json({ error: `${key} must be a number >= 100` }, 400);
        }
      }
    }
    
    // Validate theme_default
    if (updates.theme_default && !["auto", "dark", "light"].includes(updates.theme_default)) {
      return c.json({ error: "theme_default must be 'auto', 'dark', or 'light'" }, 400);
    }

    // Validate telemetry_enabled
    if (updates.telemetry_enabled && !["true", "false"].includes(updates.telemetry_enabled)) {
      return c.json({ error: "telemetry_enabled must be 'true' or 'false'" }, 400);
    }
    
    // Upsert each setting
    for (const [key, value] of Object.entries(updates)) {
      await db
        .insert(settings)
        .values({
          key,
          value: String(value),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: String(value),
            updatedAt: new Date(),
          },
        });
    }
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

export { settingsRouter };
