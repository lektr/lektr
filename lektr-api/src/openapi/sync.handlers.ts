import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db";
import { books, highlights, decks, flashcards, tags, highlightTags, bookTags } from "../db/schema";
import { eq, gt, and, sql, isNull, isNotNull } from "drizzle-orm";
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
    tags: emptyTableChanges.optional(),
    highlight_tags: emptyTableChanges.optional(),
    book_tags: emptyTableChanges.optional(),
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
    try {
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
    let decksDeleted: string[] = [];
    if (!lastPulledDate) {
      decksCreated = await db.select().from(decks).where(and(eq(decks.userId, user.userId), isNull(decks.deletedAt)));
    } else {
      decksCreated = await db.select().from(decks).where(and(
        eq(decks.userId, user.userId),
        isNull(decks.deletedAt),
        gt(decks.createdAt, lastPulledDate)
      ));
      decksUpdated = await db.select().from(decks).where(and(
        eq(decks.userId, user.userId),
        isNull(decks.deletedAt),
        gt(decks.updatedAt, lastPulledDate),
        sql`${decks.createdAt} <= ${lastPulledDate.toISOString()}`
      ));
      decksDeleted = (await db.select({ id: decks.id }).from(decks).where(and(
        eq(decks.userId, user.userId),
        isNotNull(decks.deletedAt),
        gt(decks.deletedAt, lastPulledDate)
      ))).map(d => d.id);
    }
    // === Flashcards ===
    let flashcardsCreated: any[] = [];
    let flashcardsUpdated: any[] = [];
    let flashcardsDeleted: string[] = [];
    if (!lastPulledDate) {
      flashcardsCreated = await db.select().from(flashcards).where(and(eq(flashcards.userId, user.userId), isNull(flashcards.deletedAt)));
    } else {
      flashcardsCreated = await db.select().from(flashcards).where(and(
        eq(flashcards.userId, user.userId),
        isNull(flashcards.deletedAt),
        gt(flashcards.createdAt, lastPulledDate)
      ));
      flashcardsUpdated = await db.select().from(flashcards).where(and(
        eq(flashcards.userId, user.userId),
        isNull(flashcards.deletedAt),
        gt(flashcards.updatedAt, lastPulledDate),
        sql`${flashcards.createdAt} <= ${lastPulledDate.toISOString()}`
      ));
      flashcardsDeleted = (await db.select({ id: flashcards.id }).from(flashcards).where(and(
        eq(flashcards.userId, user.userId),
        isNotNull(flashcards.deletedAt),
        gt(flashcards.deletedAt, lastPulledDate)
      ))).map(f => f.id);
    }
    // === Tags ===
    let tagsCreated: any[] = [];
    let tagsUpdated: any[] = [];
    let tagsDeleted: string[] = [];
    if (!lastPulledDate) {
      tagsCreated = await db.select().from(tags).where(and(eq(tags.userId, user.userId), isNull(tags.deletedAt)));
    } else {
      tagsCreated = await db.select().from(tags).where(and(
        eq(tags.userId, user.userId),
        isNull(tags.deletedAt),
        gt(tags.createdAt, lastPulledDate)
      ));
      tagsUpdated = await db.select().from(tags).where(and(
        eq(tags.userId, user.userId),
        isNull(tags.deletedAt),
        gt(tags.updatedAt, lastPulledDate),
        sql`${tags.createdAt} <= ${lastPulledDate.toISOString()}`
      ));
      tagsDeleted = (await db.select({ id: tags.id }).from(tags).where(and(
        eq(tags.userId, user.userId),
        isNotNull(tags.deletedAt),
        gt(tags.deletedAt, lastPulledDate)
      ))).map(t => t.id);
    }
    // === Highlight Tags ===
    let highlightTagsCreated: any[] = [];
    let highlightTagsUpdated: any[] = [];
    let highlightTagsDeleted: string[] = [];
    // Join through tags to scope by userId
    if (!lastPulledDate) {
      highlightTagsCreated = await db.select({ id: highlightTags.id, highlightId: highlightTags.highlightId, tagId: highlightTags.tagId, createdAt: highlightTags.createdAt, updatedAt: highlightTags.updatedAt })
        .from(highlightTags).innerJoin(tags, eq(highlightTags.tagId, tags.id))
        .where(and(eq(tags.userId, user.userId), isNull(highlightTags.deletedAt)));
    } else {
      highlightTagsCreated = await db.select({ id: highlightTags.id, highlightId: highlightTags.highlightId, tagId: highlightTags.tagId, createdAt: highlightTags.createdAt, updatedAt: highlightTags.updatedAt })
        .from(highlightTags).innerJoin(tags, eq(highlightTags.tagId, tags.id))
        .where(and(eq(tags.userId, user.userId), isNull(highlightTags.deletedAt), gt(highlightTags.createdAt, lastPulledDate)));
      highlightTagsUpdated = await db.select({ id: highlightTags.id, highlightId: highlightTags.highlightId, tagId: highlightTags.tagId, createdAt: highlightTags.createdAt, updatedAt: highlightTags.updatedAt })
        .from(highlightTags).innerJoin(tags, eq(highlightTags.tagId, tags.id))
        .where(and(eq(tags.userId, user.userId), isNull(highlightTags.deletedAt), gt(highlightTags.updatedAt, lastPulledDate), sql`${highlightTags.createdAt} <= ${lastPulledDate.toISOString()}`));
      highlightTagsDeleted = (await db.select({ id: highlightTags.id })
        .from(highlightTags).innerJoin(tags, eq(highlightTags.tagId, tags.id))
        .where(and(eq(tags.userId, user.userId), isNotNull(highlightTags.deletedAt), gt(highlightTags.deletedAt, lastPulledDate)))).map(ht => ht.id);
    }
    // === Book Tags ===
    let bookTagsCreated: any[] = [];
    let bookTagsUpdated: any[] = [];
    let bookTagsDeleted: string[] = [];
    if (!lastPulledDate) {
      bookTagsCreated = await db.select({ id: bookTags.id, bookId: bookTags.bookId, tagId: bookTags.tagId, createdAt: bookTags.createdAt, updatedAt: bookTags.updatedAt })
        .from(bookTags).innerJoin(tags, eq(bookTags.tagId, tags.id))
        .where(and(eq(tags.userId, user.userId), isNull(bookTags.deletedAt)));
    } else {
      bookTagsCreated = await db.select({ id: bookTags.id, bookId: bookTags.bookId, tagId: bookTags.tagId, createdAt: bookTags.createdAt, updatedAt: bookTags.updatedAt })
        .from(bookTags).innerJoin(tags, eq(bookTags.tagId, tags.id))
        .where(and(eq(tags.userId, user.userId), isNull(bookTags.deletedAt), gt(bookTags.createdAt, lastPulledDate)));
      bookTagsUpdated = await db.select({ id: bookTags.id, bookId: bookTags.bookId, tagId: bookTags.tagId, createdAt: bookTags.createdAt, updatedAt: bookTags.updatedAt })
        .from(bookTags).innerJoin(tags, eq(bookTags.tagId, tags.id))
        .where(and(eq(tags.userId, user.userId), isNull(bookTags.deletedAt), gt(bookTags.updatedAt, lastPulledDate), sql`${bookTags.createdAt} <= ${lastPulledDate.toISOString()}`));
      bookTagsDeleted = (await db.select({ id: bookTags.id })
        .from(bookTags).innerJoin(tags, eq(bookTags.tagId, tags.id))
        .where(and(eq(tags.userId, user.userId), isNotNull(bookTags.deletedAt), gt(bookTags.deletedAt, lastPulledDate)))).map(bt => bt.id);
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
      chapter: h.chapter,
      page_number: h.page,
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
    const mapTag = (t: any) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      created_at: toTimestamp(t.createdAt),
      updated_at: toTimestamp(t.updatedAt),
    });
    const mapHighlightTag = (ht: any) => ({
      id: ht.id,
      highlight_id: ht.highlightId,
      tag_id: ht.tagId,
      created_at: toTimestamp(ht.createdAt),
      updated_at: toTimestamp(ht.updatedAt),
    });
    const mapBookTag = (bt: any) => ({
      id: bt.id,
      book_id: bt.bookId,
      tag_id: bt.tagId,
      created_at: toTimestamp(bt.createdAt),
      updated_at: toTimestamp(bt.updatedAt),
    });
    const response: SyncResponse = {
      changes: {
        books: {
          created: [],
          updated: [...booksCreated.map(mapBook), ...booksUpdated.map(mapBook)],
          deleted: booksDeleted,
        },
        highlights: {
          created: [],
          updated: [...highlightsCreated.map(mapHighlight), ...highlightsUpdated.map(mapHighlight)],
          deleted: highlightsDeleted,
        },
        decks: {
          created: [],
          updated: [...decksCreated.map(mapDeck), ...decksUpdated.map(mapDeck)],
          deleted: decksDeleted,
        },
        flashcards: {
          created: [],
          updated: [...flashcardsCreated.map(mapFlashcard), ...flashcardsUpdated.map(mapFlashcard)],
          deleted: flashcardsDeleted,
        },
        tags: {
          created: [],
          updated: [...tagsCreated.map(mapTag), ...tagsUpdated.map(mapTag)],
          deleted: tagsDeleted,
        },
        highlight_tags: {
          created: [],
          updated: [...highlightTagsCreated.map(mapHighlightTag), ...highlightTagsUpdated.map(mapHighlightTag)],
          deleted: highlightTagsDeleted,
        },
        book_tags: {
          created: [],
          updated: [...bookTagsCreated.map(mapBookTag), ...bookTagsUpdated.map(mapBookTag)],
          deleted: bookTagsDeleted,
        },
      },
      timestamp: Date.now(),
    };
    return c.json(response);
    } catch (error) {
      console.error('[sync pull] Error:', error);
      return c.json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500) as any;
    }
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
    try {
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
             sourceType: 'manual',
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
             chapter: highlight.chapter,
             page: highlight.page_number,
             createdAt: new Date(highlight.created_at),
             syncedAt: new Date(highlight.updated_at),
           }).onConflictDoNothing();
        }
        for (const highlight of updated) {
           await tx.update(highlights).set({
             content: highlight.content,
             note: highlight.note,
             chapter: highlight.chapter,
             page: highlight.page_number,
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
          // Upsert: sendCreatedAsUpdated means new records arrive as 'updated'
          const exists = await tx.select({ id: decks.id }).from(decks).where(eq(decks.id, deck.id));
          if (exists.length > 0) {
            await tx.update(decks).set({
              title: deck.title,
              description: deck.description,
              type: deck.type || 'manual',
              tagLogic: deck.tag_logic,
              settings: deck.settings ? JSON.parse(deck.settings) : null,
              updatedAt: new Date(Date.now()),
            }).where(and(eq(decks.id, deck.id), eq(decks.userId, user.userId)));
          } else {
            await tx.insert(decks).values({
              id: deck.id,
              userId: user.userId,
              title: deck.title,
              description: deck.description,
              type: deck.type || 'manual',
              tagLogic: deck.tag_logic,
              settings: deck.settings ? JSON.parse(deck.settings) : null,
              createdAt: new Date(deck.created_at || Date.now()),
              updatedAt: new Date(Date.now()),
            }).onConflictDoNothing();
          }
        }
        for (const id of deleted) {
          await tx.update(decks).set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          }).where(and(eq(decks.id, id), eq(decks.userId, user.userId)));
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
          // Upsert: sendCreatedAsUpdated means new records arrive as 'updated'
          const exists = await tx.select({ id: flashcards.id }).from(flashcards).where(eq(flashcards.id, card.id));
          if (exists.length > 0) {
            await tx.update(flashcards).set({
              front: card.front,
              back: card.back,
              cardType: card.card_type || 'basic',
              fsrsData: card.fsrs_data ? JSON.parse(card.fsrs_data) : null,
              dueAt: card.due_at ? new Date(card.due_at) : null,
              updatedAt: new Date(Date.now()),
            }).where(and(eq(flashcards.id, card.id), eq(flashcards.userId, user.userId)));
          } else {
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
              createdAt: new Date(card.created_at || Date.now()),
              updatedAt: new Date(Date.now()),
            }).onConflictDoNothing();
          }
        }
        for (const id of deleted) {
          await tx.update(flashcards).set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          }).where(and(eq(flashcards.id, id), eq(flashcards.userId, user.userId)));
        }
      }
      // === Tags ===
      if (changes.tags) {
        const { created, updated, deleted } = changes.tags;
        for (const tag of created) {
          await tx.insert(tags).values({
            id: tag.id,
            userId: user.userId,
            name: tag.name,
            color: tag.color,
            createdAt: new Date(tag.created_at),
            updatedAt: new Date(tag.updated_at),
          }).onConflictDoNothing();
        }
        for (const tag of updated) {
          const exists = await tx.select({ id: tags.id }).from(tags).where(eq(tags.id, tag.id));
          if (exists.length > 0) {
            await tx.update(tags).set({
              name: tag.name,
              color: tag.color,
              updatedAt: new Date(Date.now()),
            }).where(and(eq(tags.id, tag.id), eq(tags.userId, user.userId)));
          } else {
            await tx.insert(tags).values({
              id: tag.id,
              userId: user.userId,
              name: tag.name,
              color: tag.color,
              createdAt: new Date(tag.created_at || Date.now()),
              updatedAt: new Date(Date.now()),
            }).onConflictDoNothing();
          }
        }
        for (const id of deleted) {
          await tx.update(tags).set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          }).where(and(eq(tags.id, id), eq(tags.userId, user.userId)));
        }
      }
      // === Highlight Tags ===
      if (changes.highlight_tags) {
        const { created, updated, deleted } = changes.highlight_tags;
        for (const ht of created) {
          await tx.insert(highlightTags).values({
            id: ht.id,
            highlightId: ht.highlight_id,
            tagId: ht.tag_id,
            createdAt: new Date(ht.created_at),
            updatedAt: new Date(ht.updated_at),
          }).onConflictDoNothing();
        }
        for (const ht of updated) {
          const exists = await tx.select({ id: highlightTags.id }).from(highlightTags).where(eq(highlightTags.id, ht.id));
          if (exists.length > 0) {
            await tx.update(highlightTags).set({
              highlightId: ht.highlight_id,
              tagId: ht.tag_id,
              updatedAt: new Date(Date.now()),
            }).where(eq(highlightTags.id, ht.id));
          } else {
            await tx.insert(highlightTags).values({
              id: ht.id,
              highlightId: ht.highlight_id,
              tagId: ht.tag_id,
              createdAt: new Date(ht.created_at || Date.now()),
              updatedAt: new Date(Date.now()),
            }).onConflictDoNothing();
          }
        }
        for (const id of deleted) {
          await tx.update(highlightTags).set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(highlightTags.id, id));
        }
      }
      // === Book Tags ===
      if (changes.book_tags) {
        const { created, updated, deleted } = changes.book_tags;
        for (const bt of created) {
          await tx.insert(bookTags).values({
            id: bt.id,
            bookId: bt.book_id,
            tagId: bt.tag_id,
            createdAt: new Date(bt.created_at),
            updatedAt: new Date(bt.updated_at),
          }).onConflictDoNothing();
        }
        for (const bt of updated) {
          const exists = await tx.select({ id: bookTags.id }).from(bookTags).where(eq(bookTags.id, bt.id));
          if (exists.length > 0) {
            await tx.update(bookTags).set({
              bookId: bt.book_id,
              tagId: bt.tag_id,
              updatedAt: new Date(Date.now()),
            }).where(eq(bookTags.id, bt.id));
          } else {
            await tx.insert(bookTags).values({
              id: bt.id,
              bookId: bt.book_id,
              tagId: bt.tag_id,
              createdAt: new Date(bt.created_at || Date.now()),
              updatedAt: new Date(Date.now()),
            }).onConflictDoNothing();
          }
        }
        for (const id of deleted) {
          await tx.update(bookTags).set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(bookTags.id, id));
        }
      }
    });
    } catch (error) {
      console.error('[sync push] Transaction error:', error);
      throw error;
    }
    return c.json({ success: true });
  }
);
