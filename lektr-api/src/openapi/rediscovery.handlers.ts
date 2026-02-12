import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../db";
import {
  highlights,
  books as booksTable,
  tags,
  highlightTags,
} from "../db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { getRediscoveryRoute } from "./rediscovery.routes";

export const rediscoveryOpenAPI = new OpenAPIHono();

// All rediscovery routes require auth
rediscoveryOpenAPI.use("*", authMiddleware);

// GET / — Return random highlights for rediscovery
rediscoveryOpenAPI.openapi(getRediscoveryRoute, async (c) => {
  const user = c.get("user");
  const { count: countStr } = c.req.valid("query");

  // Parse and clamp count to 1-20 range
  const rawCount = parseInt(countStr || "5", 10);
  const count = Number.isNaN(rawCount)
    ? 5
    : Math.max(1, Math.min(20, rawCount));

  try {
    // Fetch random highlights with book info in a single query
    const randomHighlights = await db
      .select({
        id: highlights.id,
        content: highlights.content,
        note: highlights.note,
        chapter: highlights.chapter,
        page: highlights.page,
        highlightedAt: highlights.highlightedAt,
        bookId: booksTable.id,
        bookTitle: booksTable.title,
        bookAuthor: booksTable.author,
        coverImageUrl: booksTable.coverImageUrl,
      })
      .from(highlights)
      .innerJoin(booksTable, eq(highlights.bookId, booksTable.id))
      .where(
        and(
          eq(highlights.userId, user.userId),
          isNull(highlights.deletedAt),
          isNull(booksTable.deletedAt)
        )
      )
      .orderBy(sql`RANDOM()`)
      .limit(count);

    // Enrich with tags
    const enriched = await Promise.all(
      randomHighlights.map(async (hl) => {
        const hlTags = await db
          .select({ id: tags.id, name: tags.name, color: tags.color })
          .from(highlightTags)
          .innerJoin(tags, eq(highlightTags.tagId, tags.id))
          .where(eq(highlightTags.highlightId, hl.id));

        return {
          id: hl.id,
          content: hl.content,
          note: hl.note,
          chapter: hl.chapter,
          page: hl.page,
          highlightedAt: hl.highlightedAt?.toISOString() ?? null,
          bookId: hl.bookId,
          bookTitle: hl.bookTitle,
          bookAuthor: hl.bookAuthor,
          coverImageUrl: hl.coverImageUrl,
          tags: hlTags,
        };
      })
    );

    return c.json({ highlights: enriched }, 200);
  } catch (error) {
    console.error("Rediscovery query failed:", error);
    return c.json({ error: "Failed to fetch rediscovery highlights" }, 500);
  }
});
