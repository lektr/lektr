import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../db";
import { settings, highlights } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import {
  getSettingsRoute,
  updateSettingsRoute,
  checkReductionRoute,
} from "./settings.routes";

// Default settings (fallback if not in DB)
const DEFAULT_SETTINGS: Record<string, string> = {
  max_highlight_length: "5000",
  max_note_length: "1000",
  display_collapse_length: "500",
  theme_default: "auto",
  telemetry_enabled: "true",
};

export const settingsOpenAPI = new OpenAPIHono();

// Helper to get a single setting (exported for use by other modules)
export async function getSetting(key: string): Promise<string> {
  const [setting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  return setting?.value ?? DEFAULT_SETTINGS[key] ?? "";
}

// GET / - List all settings (no auth)
settingsOpenAPI.openapi(getSettingsRoute, async (c) => {
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

  return c.json({ settings: result }, 200);
});

// Protected routes - apply auth middleware
const protectedSettings = new OpenAPIHono();
protectedSettings.use("*", authMiddleware);

// GET /check-reduction - Check highlight reduction impact (auth required)
protectedSettings.openapi(checkReductionRoute, async (c) => {
  const { limit } = c.req.valid("query");
  const newLimit = parseInt(limit || "0", 10);

  if (!newLimit || newLimit < 100) {
    return c.json({ error: "Invalid limit" }, 400);
  }

  // Count highlights that exceed the new limit
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(highlights)
    .where(sql`length(content) > ${newLimit}`);

  return c.json(
    {
      affectedCount: Number(result?.count ?? 0),
      newLimit,
    },
    200
  );
});

// PATCH / - Update settings (admin only)
protectedSettings.openapi(updateSettingsRoute, async (c) => {
  const user = c.get("user");
  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const body = c.req.valid("json");
  const updates = body.settings;

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

  return c.json({ success: true }, 200);
});

// Mount protected routes
settingsOpenAPI.route("/", protectedSettings);
