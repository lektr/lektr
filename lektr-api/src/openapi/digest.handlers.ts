import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import {
  getDigestPreferencesRoute,
  updateDigestPreferencesRoute,
} from "./digest.routes";

// Valid IANA timezones — we validate by trying to use them
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const digestOpenAPI = new OpenAPIHono();

// All digest routes require auth
digestOpenAPI.use("*", authMiddleware);

// GET / — Get current user's digest preferences
digestOpenAPI.openapi(getDigestPreferencesRoute, async (c) => {
  const user = c.get("user");

  const [userData] = await db
    .select({
      digestEnabled: users.digestEnabled,
      digestFrequency: users.digestFrequency,
      digestHour: users.digestHour,
      digestTimezone: users.digestTimezone,
    })
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1);

  if (!userData) {
    return c.json({ error: "User not found" }, 401);
  }

  return c.json(
    {
      digestEnabled: userData.digestEnabled !== "false",
      digestFrequency: (userData.digestFrequency || "daily") as "daily" | "weekdays" | "weekly",
      digestHour: userData.digestHour ?? 8,
      digestTimezone: userData.digestTimezone || "UTC",
    },
    200
  );
});

// PATCH / — Update current user's digest preferences
digestOpenAPI.openapi(updateDigestPreferencesRoute, async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  // Validate timezone if provided
  if (body.digestTimezone !== undefined && !isValidTimezone(body.digestTimezone)) {
    return c.json({ error: `Invalid timezone: ${body.digestTimezone}` }, 400);
  }

  // Build update object — only set fields that were provided
  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (body.digestEnabled !== undefined) {
    updateData.digestEnabled = body.digestEnabled ? "true" : "false";
  }
  if (body.digestFrequency !== undefined) {
    updateData.digestFrequency = body.digestFrequency;
  }
  if (body.digestHour !== undefined) {
    updateData.digestHour = body.digestHour;
  }
  if (body.digestTimezone !== undefined) {
    updateData.digestTimezone = body.digestTimezone;
  }

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, user.userId));

  // Return updated preferences
  const [updated] = await db
    .select({
      digestEnabled: users.digestEnabled,
      digestFrequency: users.digestFrequency,
      digestHour: users.digestHour,
      digestTimezone: users.digestTimezone,
    })
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1);

  return c.json(
    {
      digestEnabled: updated.digestEnabled !== "false",
      digestFrequency: (updated.digestFrequency || "daily") as "daily" | "weekdays" | "weekly",
      digestHour: updated.digestHour ?? 8,
      digestTimezone: updated.digestTimezone || "UTC",
    },
    200
  );
});
