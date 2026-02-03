import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../db";
import { books as booksTable, highlights } from "../db/schema";
import { eq, isNotNull, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { listTrashRoute } from "./trash.routes";

export const trashOpenAPI = new OpenAPIHono();

// All routes require auth
trashOpenAPI.use("*", authMiddleware);

// GET / - List all deleted highlights
trashOpenAPI.openapi(listTrashRoute, async (c) => {
  const user = c.get("user");

  // Get all soft-deleted highlights with their book info
  const deletedHighlights = await db
    .select({
      id: highlights.id,
      bookId: highlights.bookId,
      content: highlights.content,
      note: highlights.note,
      chapter: highlights.chapter,
      page: highlights.page,
      deletedAt: highlights.deletedAt,
      highlightedAt: highlights.highlightedAt,
      bookTitle: booksTable.title,
      bookAuthor: booksTable.author,
    })
    .from(highlights)
    .innerJoin(booksTable, eq(highlights.bookId, booksTable.id))
    .where(and(
      eq(booksTable.userId, user.userId),
      isNotNull(highlights.deletedAt)
    ));

  return c.json({
    highlights: deletedHighlights.map((h) => ({
      id: h.id,
      bookId: h.bookId,
      bookTitle: h.bookTitle,
      bookAuthor: h.bookAuthor,
      content: h.content,
      note: h.note,
      chapter: h.chapter,
      page: h.page,
      deletedAt: h.deletedAt?.toISOString() ?? "",
      highlightedAt: h.highlightedAt?.toISOString() ?? null,
    })),
  }, 200);
});

