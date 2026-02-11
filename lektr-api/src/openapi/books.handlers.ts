import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../db";
import { books as booksTable, highlights, tags, highlightTags, bookTags, flashcards } from "../db/schema";
import { eq, count, max, isNull, and, lte, sql, inArray } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { getSetting } from "./settings.handlers";
import {
  listBooksRoute,
  getBookRoute,
  updateBookRoute,
  updateMetadataRoute,
  updateHighlightRoute,
  deleteBookRoute,
  deleteHighlightRoute,
  togglePinRoute,
  restoreHighlightRoute,
  hardDeleteHighlightRoute,
  getBookStudySessionRoute,
  getBookStudyStatsRoute,
} from "./books.routes";

export const booksOpenAPI = new OpenAPIHono();

// All routes require auth
booksOpenAPI.use("*", authMiddleware);

// GET / - List all books
booksOpenAPI.openapi(listBooksRoute, async (c) => {
  const user = c.get("user");

  const userBooks = await db
    .select({
      id: booksTable.id,
      title: booksTable.title,
      author: booksTable.author,
      sourceType: booksTable.sourceType,
      coverImageUrl: booksTable.coverImageUrl,
      pinnedAt: booksTable.pinnedAt,
      createdAt: booksTable.createdAt,
    })
    .from(booksTable)
    .where(eq(booksTable.userId, user.userId));

  const booksWithCounts = await Promise.all(
    userBooks.map(async (book) => {
      const [result] = await db
        .select({
          count: count(),
          lastHighlightedAt: max(sql`COALESCE(${highlights.highlightedAt}, ${highlights.createdAt})`),
        })
        .from(highlights)
        .where(and(eq(highlights.bookId, book.id), isNull(highlights.deletedAt)));

      const bookTagsList = await db
        .select({ id: tags.id, name: tags.name, color: tags.color })
        .from(bookTags)
        .innerJoin(tags, eq(bookTags.tagId, tags.id))
        .where(eq(bookTags.bookId, book.id));

      return {
        ...book,
        createdAt: book.createdAt.toISOString(),
        pinnedAt: book.pinnedAt?.toISOString() ?? null,
        highlightCount: result?.count ?? 0,
        lastHighlightedAt: result?.lastHighlightedAt ? new Date(result.lastHighlightedAt as unknown as string).toISOString() : null,
        tags: bookTagsList,
      };
    })
  );

  booksWithCounts.sort((a, b) => {
    const aDate = a.lastHighlightedAt || a.createdAt;
    const bDate = b.lastHighlightedAt || b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  return c.json({ books: booksWithCounts }, 200);
});

// GET /:id - Get single book with highlights
booksOpenAPI.openapi(getBookRoute, async (c) => {
  const user = c.get("user");
  const { id: bookId } = c.req.valid("param");
  const { includeDeleted } = c.req.valid("query");
  const shouldIncludeDeleted = includeDeleted === "true";

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);

  if (!book) {
    return c.json({ error: "Book not found" }, 404);
  }

  if (book.userId !== user.userId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  const bookHighlights = await db
    .select()
    .from(highlights)
    .where(
      shouldIncludeDeleted
        ? eq(highlights.bookId, bookId)
        : and(eq(highlights.bookId, bookId), isNull(highlights.deletedAt))
    )
    .orderBy(highlights.page);

  const highlightsWithTags = await Promise.all(
    bookHighlights.map(async (highlight) => {
      const highlightTagsList = await db
        .select({ id: tags.id, name: tags.name, color: tags.color })
        .from(highlightTags)
        .innerJoin(tags, eq(highlightTags.tagId, tags.id))
        .where(eq(highlightTags.highlightId, highlight.id));

      return {
        id: highlight.id,
        bookId: highlight.bookId,
        content: highlight.content,
        originalContent: highlight.originalContent,
        note: highlight.note,
        chapter: highlight.chapter,
        page: highlight.page,
        sourceUrl: highlight.sourceUrl,
        positionPercent: highlight.positionPercent,
        highlightedAt: highlight.highlightedAt?.toISOString() ?? null,
        createdAt: highlight.createdAt.toISOString(),
        tags: highlightTagsList,
      };
    })
  );

  const bookTagsList = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(bookTags)
    .innerJoin(tags, eq(bookTags.tagId, tags.id))
    .where(eq(bookTags.bookId, bookId));

  return c.json({
    book: {
      id: book.id,
      title: book.title,
      author: book.author,
      sourceType: book.sourceType,
      coverImageUrl: book.coverImageUrl,
      metadata: book.metadata,
      createdAt: book.createdAt.toISOString(),
      tags: bookTagsList,
    },
    highlights: highlightsWithTags,
  }, 200);
});

// PATCH /:id - Update book
booksOpenAPI.openapi(updateBookRoute, async (c) => {
  const user = c.get("user");
  const { id: bookId } = c.req.valid("param");
  const { title, author } = c.req.valid("json");

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);

  if (!book) {
    return c.json({ error: "Book not found" }, 404);
  }

  if (book.userId !== user.userId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  const updateData: { title?: string; author?: string; updatedAt: Date } = { updatedAt: new Date() };
  if (title !== undefined) updateData.title = title;
  if (author !== undefined) updateData.author = author;

  await db.update(booksTable).set(updateData).where(eq(booksTable.id, bookId));

  return c.json({ success: true, bookId }, 200);
});

// PATCH /:id/metadata - Update book metadata
booksOpenAPI.openapi(updateMetadataRoute, async (c) => {
  const user = c.get("user");
  const { id: bookId } = c.req.valid("param");
  const { coverImageUrl, description, pageCount, publishedDate, genres } = c.req.valid("json");

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);

  if (!book) {
    return c.json({ error: "Book not found" }, 404);
  }

  if (book.userId !== user.userId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  const currentMeta = (book.metadata as Record<string, unknown>) || {};
  const newMetadata = {
    ...currentMeta,
    ...(description && { description }),
    ...(pageCount && { pageCount }),
    ...(publishedDate && { publishedDate }),
    ...(genres && { genres }),
  };

  await db
    .update(booksTable)
    .set({
      ...(coverImageUrl && { coverImageUrl }),
      metadata: newMetadata,
      updatedAt: new Date(),
    })
    .where(eq(booksTable.id, bookId));

  return c.json({ success: true, bookId }, 200);
});

// PATCH /:bookId/highlights/:highlightId - Update highlight
booksOpenAPI.openapi(updateHighlightRoute, async (c) => {
  const user = c.get("user");
  const { bookId, highlightId } = c.req.valid("param");
  const { content, note } = c.req.valid("json");

  const maxHighlightLength = parseInt(await getSetting("max_highlight_length"), 10) || 5000;
  const maxNoteLength = parseInt(await getSetting("max_note_length"), 10) || 1000;

  if (content !== undefined && content.length > maxHighlightLength) {
    return c.json({ error: `Highlight content cannot exceed ${maxHighlightLength} characters` }, 400);
  }

  if (note !== undefined && note !== null && note.length > maxNoteLength) {
    return c.json({ error: `Note cannot exceed ${maxNoteLength} characters` }, 400);
  }

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);

  if (!book) {
    return c.json({ error: "Book not found" }, 404);
  }

  if (book.userId !== user.userId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  const [highlight] = await db.select().from(highlights).where(eq(highlights.id, highlightId)).limit(1);

  if (!highlight) {
    return c.json({ error: "Highlight not found" }, 404);
  }

  if (highlight.bookId !== bookId) {
    return c.json({ error: "Highlight does not belong to this book" }, 400);
  }

  const updateData: { content?: string; note?: string | null; originalContent?: string } = {};
  if (content !== undefined) {
    updateData.content = content;
    // If updating content and originalContent is missing, save current content as original
    if (!highlight.originalContent) {
      updateData.originalContent = highlight.content;
    }
  }
  if (note !== undefined) updateData.note = note;

  await db.update(highlights).set(updateData).where(eq(highlights.id, highlightId));

  return c.json({ success: true, highlightId }, 200);
});

// DELETE /:id - Delete book
booksOpenAPI.openapi(deleteBookRoute, async (c) => {
  const user = c.get("user");
  const { id: bookId } = c.req.valid("param");

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);

  if (!book) {
    return c.json({ error: "Book not found" }, 404);
  }

  if (book.userId !== user.userId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  // Soft-delete all highlights in the book (set deletedAt)
  const now = new Date();
  await db.update(highlights)
    .set({ deletedAt: now })
    .where(eq(highlights.bookId, bookId));

  return c.json({ success: true, message: "Book highlights moved to trash" }, 200);
});


// DELETE /:bookId/highlights/:highlightId - Delete highlight
booksOpenAPI.openapi(deleteHighlightRoute, async (c) => {
  const user = c.get("user");
  const { bookId, highlightId } = c.req.valid("param");

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);

  if (!book) {
    return c.json({ error: "Book not found" }, 404);
  }

  if (book.userId !== user.userId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  const [highlight] = await db.select().from(highlights).where(eq(highlights.id, highlightId)).limit(1);

  if (!highlight) {
    return c.json({ error: "Highlight not found" }, 404);
  }

  if (highlight.bookId !== bookId) {
    return c.json({ error: "Highlight does not belong to this book" }, 400);
  }

  // Soft delete: set deletedAt instead of removing the row
  await db.update(highlights).set({ deletedAt: new Date() }).where(eq(highlights.id, highlightId));

  return c.json({ success: true, message: "Highlight deleted" }, 200);
});

// POST /:id/pin - Toggle book pin status
booksOpenAPI.openapi(togglePinRoute, async (c) => {
  const user = c.get("user");
  const { id: bookId } = c.req.valid("param");

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId)).limit(1);

  if (!book) {
    return c.json({ error: "Book not found" }, 404);
  }

  if (book.userId !== user.userId) {
    return c.json({ error: "Not authorized to modify this book" }, 403);
  }

  // Toggle: if pinned, unpin; if not pinned, pin
  const newPinnedAt = book.pinnedAt ? null : new Date();

  await db
    .update(booksTable)
    .set({ pinnedAt: newPinnedAt })
    .where(eq(booksTable.id, bookId));

  return c.json({
    success: true,
    pinned: newPinnedAt !== null,
    pinnedAt: newPinnedAt?.toISOString() ?? null,
  }, 200);
});

// PATCH /highlights/:highlightId/restore - Restore soft-deleted highlight
booksOpenAPI.openapi(restoreHighlightRoute, async (c) => {
  const user = c.get("user");
  const { highlightId } = c.req.valid("param");

  const [highlight] = await db
    .select({
      id: highlights.id,
      bookId: highlights.bookId,
      deletedAt: highlights.deletedAt,
    })
    .from(highlights)
    .where(eq(highlights.id, highlightId))
    .limit(1);

  if (!highlight) {
    return c.json({ error: "Highlight not found" }, 404);
  }

  // Check book ownership
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, highlight.bookId)).limit(1);

  if (!book || book.userId !== user.userId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  // Restore: set deletedAt to null
  await db.update(highlights).set({ deletedAt: null }).where(eq(highlights.id, highlightId));

  return c.json({ success: true, message: "Highlight restored" }, 200);
});

// DELETE /highlights/:highlightId/permanent - Permanently delete highlight
booksOpenAPI.openapi(hardDeleteHighlightRoute, async (c) => {
  const user = c.get("user");
  const { highlightId } = c.req.valid("param");

  const [highlight] = await db
    .select({
      id: highlights.id,
      bookId: highlights.bookId,
    })
    .from(highlights)
    .where(eq(highlights.id, highlightId))
    .limit(1);

  if (!highlight) {
    return c.json({ error: "Highlight not found" }, 404);
  }

  // Check book ownership
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, highlight.bookId)).limit(1);

  if (!book || book.userId !== user.userId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  // Hard delete: remove the row
  await db.delete(highlights).where(eq(highlights.id, highlightId));

  return c.json({ success: true, message: "Highlight permanently deleted" }, 200);
});

// ============================================
// Book Study Handlers
// ============================================

// GET /{id}/study - Get book study session
booksOpenAPI.openapi(getBookStudySessionRoute, async (c) => {
  const user = c.get("user");
  const { id: bookId } = c.req.valid("param");
  const query = c.req.valid("query");
  const limit = Math.min(50, parseInt(query.limit || "20", 10));
  const now = new Date();

  // Verify book exists and belongs to user
  const [book] = await db
    .select({ id: booksTable.id, title: booksTable.title })
    .from(booksTable)
    .where(eq(booksTable.id, bookId))
    .limit(1);

  if (!book) {
    return c.json({ error: "Book not found" }, 404);
  }

  const [bookOwner] = await db
    .select({ userId: booksTable.userId })
    .from(booksTable)
    .where(eq(booksTable.id, bookId))
    .limit(1);

  if (bookOwner.userId !== user.userId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  // Get all highlight IDs for this book
  const bookHighlightIds = await db
    .select({ id: highlights.id })
    .from(highlights)
    .where(and(eq(highlights.bookId, bookId), isNull(highlights.deletedAt)));

  const hlIds = bookHighlightIds.map((h) => h.id);

  if (hlIds.length === 0) {
    return c.json({ cards: [], totalDue: 0, totalHighlights: 0 }, 200);
  }

  type StudyItemType = {
    id: string;
    front: string;
    back: string;
    cardType: "basic" | "cloze";
    isVirtual: boolean;
    highlightId: string | null;
    deckId: string | null;
    highlight: { id: string; bookId: string; bookTitle: string } | null;
  };

  const studyItems: StudyItemType[] = [];

  // Get due flashcards linked to this book's highlights
  const dueCards = await db
    .select({
      id: flashcards.id,
      front: flashcards.front,
      back: flashcards.back,
      cardType: flashcards.cardType,
      highlightId: flashcards.highlightId,
      deckId: flashcards.deckId,
    })
    .from(flashcards)
    .where(
      and(
        eq(flashcards.userId, user.userId),
        inArray(flashcards.highlightId, hlIds),
        lte(flashcards.dueAt, now)
      )
    )
    .orderBy(flashcards.dueAt)
    .limit(limit);

  for (const card of dueCards) {
    studyItems.push({
      id: card.id,
      front: card.front,
      back: card.back,
      cardType: card.cardType,
      isVirtual: false,
      highlightId: card.highlightId,
      deckId: card.deckId,
      highlight: card.highlightId ? { id: card.highlightId, bookId, bookTitle: book.title } : null,
    });
  }

  // Fill remaining slots with virtual cards (raw highlights without flashcards)
  if (studyItems.length < limit) {
    // Get highlights that already have flashcards
    const existingHlIds = await db
      .select({ highlightId: flashcards.highlightId })
      .from(flashcards)
      .where(
        and(
          eq(flashcards.userId, user.userId),
          inArray(flashcards.highlightId, hlIds)
        )
      );

    const coveredHlIds = new Set(
      existingHlIds.filter((h) => h.highlightId).map((h) => h.highlightId as string)
    );
    const uncoveredHlIds = hlIds.filter((id) => !coveredHlIds.has(id));

    if (uncoveredHlIds.length > 0) {
      const rawHighlights = await db
        .select({
          id: highlights.id,
          content: highlights.content,
        })
        .from(highlights)
        .where(inArray(highlights.id, uncoveredHlIds.slice(0, limit - studyItems.length)));

      for (const hl of rawHighlights) {
        studyItems.push({
          id: `virtual:${hl.id}`,
          front: hl.content.length > 100 ? hl.content.slice(0, 100) + "..." : hl.content,
          back: hl.content,
          cardType: "basic",
          isVirtual: true,
          highlightId: hl.id,
          deckId: null,
          highlight: { id: hl.id, bookId, bookTitle: book.title },
        });
      }
    }
  }

  // Count total due
  const [dueResult] = await db.execute(sql`
    SELECT count(*)::int as count
    FROM flashcards
    WHERE user_id = ${user.userId}
    AND highlight_id IN (SELECT id FROM highlights WHERE book_id = ${bookId} AND deleted_at IS NULL)
    AND due_at <= NOW()
  `);

  // Count total highlights
  const [hlCountResult] = await db
    .select({ count: count() })
    .from(highlights)
    .where(and(eq(highlights.bookId, bookId), isNull(highlights.deletedAt)));

  return c.json({
    cards: studyItems,
    totalDue: Number((dueResult as { count: number }).count || 0),
    totalHighlights: hlCountResult?.count ?? 0,
  }, 200);
});

// GET /{id}/study-stats - Get book study stats
booksOpenAPI.openapi(getBookStudyStatsRoute, async (c) => {
  const user = c.get("user");
  const { id: bookId } = c.req.valid("param");

  // Verify book exists and belongs to user
  const [book] = await db
    .select({ userId: booksTable.userId })
    .from(booksTable)
    .where(eq(booksTable.id, bookId))
    .limit(1);

  if (!book) {
    return c.json({ error: "Book not found" }, 404);
  }

  if (book.userId !== user.userId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  // Count highlights
  const [hlCountResult] = await db
    .select({ count: count() })
    .from(highlights)
    .where(and(eq(highlights.bookId, bookId), isNull(highlights.deletedAt)));

  // Count total flashcards linked to this book
  const [cardResult] = await db.execute(sql`
    SELECT count(*)::int as count
    FROM flashcards
    WHERE user_id = ${user.userId}
    AND highlight_id IN (SELECT id FROM highlights WHERE book_id = ${bookId} AND deleted_at IS NULL)
  `);

  // Count due flashcards
  const [dueResult] = await db.execute(sql`
    SELECT count(*)::int as count
    FROM flashcards
    WHERE user_id = ${user.userId}
    AND highlight_id IN (SELECT id FROM highlights WHERE book_id = ${bookId} AND deleted_at IS NULL)
    AND due_at <= NOW()
  `);

  return c.json({
    dueCount: Number((dueResult as { count: number }).count || 0),
    cardCount: Number((cardResult as { count: number }).count || 0),
    highlightCount: hlCountResult?.count ?? 0,
  }, 200);
});
