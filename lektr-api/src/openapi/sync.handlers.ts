import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db";
import { books, highlights, decks, flashcards } from "../db/schema";
import { eq, gt, and, sql, isNull } from "drizzle-orm";
import { SyncResponse } from "../models/sync";
export const syncOpenAPI = new OpenAPIHono();
// All routes require auth
syncOpenAPI.use("*", authMiddleware);
// Schemas
const SyncPullSchema = z.object({
  last_pulled_at: z.string().optional().nullable(),
  schema_version: z.number().optional(),
  migration: z.any().optional(),
});
const emptyTableChanges = z.object({
  created: z.array(z.any()),
  updated: z.array(z.any()),
  deleted: z.array(z.string()),
});
const SyncPushSchema = z.object({
  changes: z.object({
    books: emptyTableChanges,
    highlights: emptyTableChanges,
    decks: emptyTableChanges.optional(),
    flashcards: emptyTableChanges.optional(),
  }),
  last_pulled_at: z.number().nullable(),
});
// PULL Endpoint
syncOpenAPI.openapi(
  createRoute({
    method: "get",
    path: "/pull",
    tags: ["Sync"],
    summary: "Pull changes from server",
    request: {
      query: SyncPullSchema,
    },
    responses: {
      200: {
        description: "Changes since last pull",
        content: {
          "application/json": {
            schema: z.object({
              changes: z.any(),
              timestamp: z.number(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const user = c.get("user");
    const { last_pulled_at } = c.req.query();
    let lastPulledDate: Date | null = null;
    if (last_pulled_at && last_pulled_at !== 'null') {
      const ts = parseInt(last_pulled_at);
      if (!isNaN(ts)) {
        lastPulledDate = new Date(ts);
      }
    }
    const toTimestamp = (date: Date) => date.getTime();
    // === Books ===
    let booksCreated: any[] = [];
    let booksUpdated: any[] = [];
    let booksDeleted: string[] = [];
    if (!lastPulledDate) {
      booksCreated = await db.select().from(books).where(and(eq(books.userId, user.userId), isNull(books.deletedAt)));
    } else {
      booksCreated = await db.select().from(books).where(and(
        eq(books.userId, user.userId),
        isNull(books.deletedAt),
        gt(books.createdAt, lastPulledDate)
      ));
      booksUpdated = await db.select().from(books).where(and(
        eq(books.userId, user.userId),
        isNull(books.deletedAt),
        gt(books.updatedAt, lastPulledDate),
        sql`${books.createdAt} <= ${lastPulledDate.toISOString()}`
      ));
      booksDeleted = (await db.select({ id: books.id }).from(books).where(and(
        eq(books.userId, user.userId),
        gt(books.deletedAt, lastPulledDate)
      ))).map(b => b.id);
    }
    // === Highlights ===
    let highlightsCreated: any[] = [];
    let highlightsUpdated: any[] = [];
    let highlightsDeleted: string[] = [];
    if (!lastPulledDate) {
      highlightsCreated = await db.select().from(highlights).where(and(eq(highlights.userId, user.userId), isNull(highlights.deletedAt)));
    } else {
      highlightsCreated = await db.select().from(highlights).where(and(
        eq(highlights.userId, user.userId),
        isNull(highlights.deletedAt),
        gt(highlights.createdAt, lastPulledDate)
      ));
      highlightsUpdated = await db.select().from(highlights).where(and(
        eq(highlights.userId, user.userId),
        isNull(highlights.deletedAt),
        gt(highlights.syncedAt, lastPulledDate),
        sql`${highlights.createdAt} <= ${lastPulledDate.toISOString()}`
      ));
      highlightsDeleted = (await db.select({ id: highlights.id }).from(highlights).where(and(
        eq(highlights.userId, user.userId),
        gt(highlights.deletedAt, lastPulledDate)
      ))).map(h => h.id);
    }
    // === Decks ===
    let decksCreated: any[] = [];
    let decksUpdated: any[] = [];
    if (!lastPulledDate) {
      decksCreated = await db.select().from(decks).where(eq(decks.userId, user.userId));
    } else {
      decksCreated = await db.select().from(decks).where(and(
        eq(decks.userId, user.userId),
        gt(decks.createdAt, lastPulledDate)
      ));
      decksUpdated = await db.select().from(decks).where(and(
        eq(decks.userId, user.userId),
        gt(decks.updatedAt, lastPulledDate),
        sql`${decks.createdAt} <= ${lastPulledDate.toISOString()}`
      ));
    }
    // === Flashcards ===
    let flashcardsCreated: any[] = [];
    let flashcardsUpdated: any[] = [];
    if (!lastPulledDate) {
      flashcardsCreated = await db.select().from(flashcards).where(eq(flashcards.userId, user.userId));
    } else {
      flashcardsCreated = await db.select().from(flashcards).where(and(
        eq(flashcards.userId, user.userId),
        gt(flashcards.createdAt, lastPulledDate)
      ));
      flashcardsUpdated = await db.select().from(flashcards).where(and(
        eq(flashcards.userId, user.userId),
        gt(flashcards.updatedAt, lastPulledDate),
        sql`${flashcards.createdAt} <= ${lastPulledDate.toISOString()}`
      ));
    }
    // Map to WatermelonDB format
    const mapBook = (b: any) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      cover_image_url: b.coverImageUrl,
      created_at: toTimestamp(b.createdAt),
      updated_at: toTimestamp(b.updatedAt),
    });
    const mapHighlight = (h: any) => ({
      id: h.id,
      book_id: h.bookId,
      content: h.content,
      note: h.note,
      created_at: toTimestamp(h.createdAt),
      updated_at: toTimestamp(h.syncedAt || h.createdAt),
    });
    const mapDeck = (d: any) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      type: d.type,
      tag_logic: d.tagLogic,
      settings: d.settings ? JSON.stringify(d.settings) : null,
      created_at: toTimestamp(d.createdAt),
      updated_at: toTimestamp(d.updatedAt),
    });
    const mapFlashcard = (f: any) => ({
      id: f.id,
      deck_id: f.deckId,
      highlight_id: f.highlightId,
      front: f.front,
      back: f.back,
      card_type: f.cardType,
      fsrs_data: f.fsrsData ? JSON.stringify(f.fsrsData) : null,
      due_at: f.dueAt ? toTimestamp(f.dueAt) : null,
      created_at: toTimestamp(f.createdAt),
      updated_at: toTimestamp(f.updatedAt),
    });
    const response: SyncResponse = {
      changes: {
        books: {
          created: booksCreated.map(mapBook),
          updated: booksUpdated.map(mapBook),
          deleted: booksDeleted,
        },
        highlights: {
          created: highlightsCreated.map(mapHighlight),
          updated: highlightsUpdated.map(mapHighlight),
          deleted: highlightsDeleted,
        },
        decks: {
          created: decksCreated.map(mapDeck),
          updated: decksUpdated.map(mapDeck),
          deleted: [], // No soft delete for decks
        },
        flashcards: {
          created: flashcardsCreated.map(mapFlashcard),
          updated: flashcardsUpdated.map(mapFlashcard),
          deleted: [], // No soft delete for flashcards
        },
      },
      timestamp: Date.now(),
    };
    return c.json(response);
  }
);
// PUSH Endpoint
syncOpenAPI.openapi(
  createRoute({
    method: "post",
    path: "/push",
    tags: ["Sync"],
    summary: "Push changes to server",
    request: {
      body: {
        content: {
          "application/json": {
            schema: SyncPushSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Push successful",
      },
    },
  }),
  async (c) => {
    const user = c.get("user");
    const { changes, last_pulled_at } = await c.req.json();
    await db.transaction(async (tx) => {
      // === Books ===
      if (changes.books) {
        const { created, updated, deleted } = changes.books;
        for (const book of created) {
           await tx.insert(books).values({
             id: book.id,
             userId: user.userId,
             title: book.title,
             author: book.author,
             coverImageUrl: book.cover_image_url,
             sourceType: 'lektr',
             createdAt: new Date(book.created_at),
             updatedAt: new Date(book.updated_at),
           }).onConflictDoNothing();
        }
        for (const book of updated) {
          await tx.update(books).set({
            title: book.title,
            author: book.author,
            coverImageUrl: book.cover_image_url,
            updatedAt: new Date(Date.now()),
          }).where(and(eq(books.id, book.id), eq(books.userId, user.userId)));
        }
        for (const id of deleted) {
           await tx.update(books).set({
             deletedAt: new Date(),
           }).where(and(eq(books.id, id), eq(books.userId, user.userId)));
        }
      }
      // === Highlights ===
      if (changes.highlights) {
        const { created, updated, deleted } = changes.highlights;
        for (const highlight of created) {
           await tx.insert(highlights).values({
             id: highlight.id,
             userId: user.userId,
             bookId: highlight.book_id,
             content: highlight.content,
             note: highlight.note,
             createdAt: new Date(highlight.created_at),
             syncedAt: new Date(highlight.updated_at),
           }).onConflictDoNothing();
        }
        for (const highlight of updated) {
           await tx.update(highlights).set({
             content: highlight.content,
             note: highlight.note,
             syncedAt: new Date(Date.now()),
           }).where(and(eq(highlights.id, highlight.id), eq(highlights.userId, user.userId)));
        }
        for (const id of deleted) {
           await tx.update(highlights).set({
             deletedAt: new Date(),
           }).where(and(eq(highlights.id, id), eq(highlights.userId, user.userId)));
        }
      }
      // === Decks ===
      if (changes.decks) {
        const { created, updated, deleted } = changes.decks;
        for (const deck of created) {
          await tx.insert(decks).values({
            id: deck.id,
            userId: user.userId,
            title: deck.title,
            description: deck.description,
            type: deck.type || 'manual',
            tagLogic: deck.tag_logic,
            settings: deck.settings ? JSON.parse(deck.settings) : null,
            createdAt: new Date(deck.created_at),
            updatedAt: new Date(deck.updated_at),
          }).onConflictDoNothing();
        }
        for (const deck of updated) {
          await tx.update(decks).set({
            title: deck.title,
            description: deck.description,
            type: deck.type || 'manual',
            tagLogic: deck.tag_logic,
            settings: deck.settings ? JSON.parse(deck.settings) : null,
            updatedAt: new Date(Date.now()),
          }).where(and(eq(decks.id, deck.id), eq(decks.userId, user.userId)));
        }
        for (const id of deleted) {
          await tx.delete(decks).where(and(eq(decks.id, id), eq(decks.userId, user.userId)));
        }
      }
      // === Flashcards ===
      if (changes.flashcards) {
        const { created, updated, deleted } = changes.flashcards;
        for (const card of created) {
          await tx.insert(flashcards).values({
            id: card.id,
            deckId: card.deck_id,
            userId: user.userId,
            highlightId: card.highlight_id || null,
            front: card.front,
            back: card.back,
            cardType: card.card_type || 'basic',
            fsrsData: card.fsrs_data ? JSON.parse(card.fsrs_data) : null,
            dueAt: card.due_at ? new Date(card.due_at) : null,
            createdAt: new Date(card.created_at),
            updatedAt: new Date(card.updated_at),
          }).onConflictDoNothing();
        }
        for (const card of updated) {
          await tx.update(flashcards).set({
            front: card.front,
            back: card.back,
            cardType: card.card_type || 'basic',
            fsrsData: card.fsrs_data ? JSON.parse(card.fsrs_data) : null,
            dueAt: card.due_at ? new Date(card.due_at) : null,
            updatedAt: new Date(Date.now()),
          }).where(and(eq(flashcards.id, card.id), eq(flashcards.userId, user.userId)));
        }
        for (const id of deleted) {
          await tx.delete(flashcards).where(and(eq(flashcards.id, id), eq(flashcards.userId, user.userId)));
        }
      }
    });
    return c.json({ success: true });
  }
);
