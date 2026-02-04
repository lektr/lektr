import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../db";
import {
  decks,
  deckTags,
  flashcards,
  tags,
  highlights,
  highlightTags,
  books,
} from "../db/schema";
import { eq, and, sql, desc, lte, inArray } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import {
  listDecksRoute,
  createDeckRoute,
  getDeckRoute,
  updateDeckRoute,
  deleteDeckRoute,
  listCardsRoute,
  createCardRoute,
  updateCardRoute,
  deleteCardRoute,
  getStudySessionRoute,
  submitReviewRoute,
  submitVirtualReviewRoute,
} from "./decks.routes";

// FSRS Rating enum
const Rating = { Again: 1, Hard: 2, Good: 3, Easy: 4 } as const;

// FSRS Default parameters
const FSRS_DEFAULTS = {
  w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
};

/**
 * Simple FSRS implementation for scheduling
 * Based on FSRS-4.5 algorithm
 */
function calculateNextReview(
  fsrsData: { stability: number; difficulty: number; state: number; due: string; lastReview: string | null } | null,
  rating: number // 1-4
): { stability: number; difficulty: number; state: number; due: string; lastReview: string } {
  const now = new Date();
  const w = FSRS_DEFAULTS.w;

  // First review - initialize
  if (!fsrsData || fsrsData.state === 0) {
    // State 0 = New
    const initialStability = w[rating - 1];
    const initialDifficulty = w[4] - w[5] * (rating - 3);
    const clampedDifficulty = Math.max(1, Math.min(10, initialDifficulty));

    // Calculate next interval based on rating
    let intervalDays = 1;
    if (rating === Rating.Again) intervalDays = 0.0007; // ~1 minute
    else if (rating === Rating.Hard) intervalDays = 0.0042; // ~6 minutes
    else if (rating === Rating.Good) intervalDays = 0.0417; // ~1 hour
    else if (rating === Rating.Easy) intervalDays = 1; // 1 day

    const dueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

    return {
      stability: initialStability,
      difficulty: clampedDifficulty,
      state: 1, // Learning
      due: dueDate.toISOString(),
      lastReview: now.toISOString(),
    };
  }

  // Subsequent reviews
  const { stability: S, difficulty: D } = fsrsData;

  // Calculate memory retrievability
  const elapsedDays = fsrsData.lastReview
    ? (now.getTime() - new Date(fsrsData.lastReview).getTime()) / (24 * 60 * 60 * 1000)
    : 0;
  const R = Math.exp(-elapsedDays / S);

  // Update difficulty
  const newD = D - w[6] * (rating - 3);
  const clampedD = Math.max(1, Math.min(10, newD));

  // Update stability
  let newS: number;
  if (rating === Rating.Again) {
    // Forgot - use forget stability formula
    newS = w[11] * Math.pow(D, -w[12]) * (Math.pow(S + 1, w[13]) - 1) * Math.exp((1 - R) * w[14]);
    newS = Math.max(0.1, Math.min(newS, S)); // Ensure stability decreases
  } else {
    // Recalled - use recall stability formula
    const hardPenalty = rating === Rating.Hard ? w[15] : 1;
    const easyBonus = rating === Rating.Easy ? w[16] : 1;
    newS = S * (1 + Math.exp(w[8]) * (11 - D) * Math.pow(S, -w[9]) * (Math.exp((1 - R) * w[10]) - 1) * hardPenalty * easyBonus);
  }

  // Calculate interval
  const desiredRetention = 0.9;
  const intervalDays = Math.max(1, newS * Math.log(desiredRetention) / Math.log(0.9));

  // Apply rating multipliers
  let adjustedInterval = intervalDays;
  if (rating === Rating.Again) adjustedInterval = Math.min(1, intervalDays * 0.5);
  else if (rating === Rating.Hard) adjustedInterval = intervalDays * 0.8;
  else if (rating === Rating.Easy) adjustedInterval = intervalDays * 1.3;

  const dueDate = new Date(now.getTime() + adjustedInterval * 24 * 60 * 60 * 1000);

  return {
    stability: newS,
    difficulty: clampedD,
    state: 2, // Review
    due: dueDate.toISOString(),
    lastReview: now.toISOString(),
  };
}

// Helper to serialize deck for response
function serializeDeck(
  deck: typeof decks.$inferSelect,
  cardCount?: number,
  dueCount?: number,
  deckTagsList?: Array<{ id: string; name: string; color: string | null }>
) {
  return {
    id: deck.id,
    title: deck.title,
    description: deck.description,
    type: deck.type,
    tagLogic: deck.tagLogic,
    settings: deck.settings as Record<string, unknown> | null,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
    cardCount,
    dueCount,
    tags: deckTagsList,
  };
}

// Helper to serialize flashcard for response
function serializeCard(card: typeof flashcards.$inferSelect, highlightData?: { id: string; content: string; bookTitle?: string; bookId?: string }) {
  return {
    id: card.id,
    deckId: card.deckId,
    highlightId: card.highlightId,
    front: card.front,
    back: card.back,
    cardType: card.cardType,
    fsrsData: card.fsrsData as { stability: number; difficulty: number; due: string; state: number; lastReview: string | null } | null,
    dueAt: card.dueAt?.toISOString() ?? null,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    highlight: highlightData,
  };
}

export const decksOpenAPI = new OpenAPIHono();
decksOpenAPI.use("*", authMiddleware);

// ============================================
// Deck CRUD Handlers
// ============================================

// GET / - List all decks
decksOpenAPI.openapi(listDecksRoute, async (c) => {
  const user = c.get("user");

  const userDecks = await db
    .select()
    .from(decks)
    .where(eq(decks.userId, user.userId))
    .orderBy(desc(decks.createdAt));

  // Get card counts per deck
  const cardCounts = await db.execute(sql`
    SELECT deck_id, count(*)::int as count
    FROM flashcards
    WHERE user_id = ${user.userId}
    GROUP BY deck_id
  `);

  // Get due counts per deck
  const dueCounts = await db.execute(sql`
    SELECT deck_id, count(*)::int as count
    FROM flashcards
    WHERE user_id = ${user.userId} AND due_at <= NOW()
    GROUP BY deck_id
  `);

  // Get tags for smart decks
  const smartDeckIds = userDecks.filter((d) => d.type === "smart").map((d) => d.id);
  let deckTagsMap = new Map<string, Array<{ id: string; name: string; color: string | null }>>();

  if (smartDeckIds.length > 0) {
    const deckTagsRows = await db
      .select({
        deckId: deckTags.deckId,
        tagId: tags.id,
        tagName: tags.name,
        tagColor: tags.color,
      })
      .from(deckTags)
      .innerJoin(tags, eq(deckTags.tagId, tags.id))
      .where(inArray(deckTags.deckId, smartDeckIds));

    for (const row of deckTagsRows) {
      if (!deckTagsMap.has(row.deckId)) {
        deckTagsMap.set(row.deckId, []);
      }
      deckTagsMap.get(row.deckId)!.push({
        id: row.tagId,
        name: row.tagName,
        color: row.tagColor,
      });
    }
  }

  const cardCountMap = new Map<string, number>();
  for (const row of cardCounts) {
    const id = (row.deck_id || row.deckId) as string;
    cardCountMap.set(id, Number(row.count || 0));
  }

  const dueCountMap = new Map<string, number>();
  for (const row of dueCounts) {
    const id = (row.deck_id || row.deckId) as string;
    dueCountMap.set(id, Number(row.count || 0));
  }

  return c.json({
    decks: userDecks.map((deck) =>
      serializeDeck(
        deck,
        cardCountMap.get(deck.id) || 0,
        dueCountMap.get(deck.id) || 0,
        deckTagsMap.get(deck.id)
      )
    ),
  }, 200);
});

// POST / - Create deck
decksOpenAPI.openapi(createDeckRoute, async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  const [newDeck] = await db
    .insert(decks)
    .values({
      userId: user.userId,
      title: body.title,
      description: body.description ?? null,
      type: body.type ?? "manual",
      tagLogic: body.type === "smart" ? (body.tagLogic ?? "AND") : null,
      settings: body.settings ?? null,
    })
    .returning();

  // If smart deck with tags, create deck_tags links
  if (body.type === "smart" && body.tagIds && body.tagIds.length > 0) {
    // Verify tags belong to user
    const userTags = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.userId, user.userId), inArray(tags.id, body.tagIds)));

    const validTagIds = userTags.map((t) => t.id);
    if (validTagIds.length > 0) {
      await db.insert(deckTags).values(
        validTagIds.map((tagId) => ({ deckId: newDeck.id, tagId }))
      );
    }
  }

  return c.json({ deck: serializeDeck(newDeck, 0, 0) }, 201);
});

// GET /:id - Get deck details
decksOpenAPI.openapi(getDeckRoute, async (c) => {
  const user = c.get("user");
  const { id: deckId } = c.req.valid("param");

  const [deck] = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, user.userId)))
    .limit(1);

  if (!deck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  // Get tags for smart deck
  let deckTagsList: Array<{ id: string; name: string; color: string | null }> | undefined;
  if (deck.type === "smart") {
    const tagRows = await db
      .select({ id: tags.id, name: tags.name, color: tags.color })
      .from(deckTags)
      .innerJoin(tags, eq(deckTags.tagId, tags.id))
      .where(eq(deckTags.deckId, deckId));
    deckTagsList = tagRows;
  }

  // Get counts
  const [cardCount] = await db.execute(sql`
    SELECT count(*)::int as count FROM flashcards WHERE deck_id = ${deckId}
  `);
  const [dueCount] = await db.execute(sql`
    SELECT count(*)::int as count FROM flashcards WHERE deck_id = ${deckId} AND due_at <= NOW()
  `);

  return c.json({
    deck: serializeDeck(
      deck,
      Number((cardCount as { count: number }).count || 0),
      Number((dueCount as { count: number }).count || 0),
      deckTagsList
    ),
  }, 200);
});

// PATCH /:id - Update deck
decksOpenAPI.openapi(updateDeckRoute, async (c) => {
  const user = c.get("user");
  const { id: deckId } = c.req.valid("param");
  const body = c.req.valid("json");

  const [existingDeck] = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, user.userId)))
    .limit(1);

  if (!existingDeck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  // Build update object
  const updateData: Partial<typeof decks.$inferInsert> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.tagLogic !== undefined && existingDeck.type === "smart") {
    updateData.tagLogic = body.tagLogic;
  }
  if (body.settings !== undefined) {
    updateData.settings = body.settings;
  }
  updateData.updatedAt = new Date();

  const [updatedDeck] = await db
    .update(decks)
    .set(updateData)
    .where(eq(decks.id, deckId))
    .returning();

  // Update tags if provided and it's a smart deck
  if (body.tagIds !== undefined && existingDeck.type === "smart") {
    // Remove existing
    await db.delete(deckTags).where(eq(deckTags.deckId, deckId));

    // Add new
    if (body.tagIds.length > 0) {
      const userTags = await db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.userId, user.userId), inArray(tags.id, body.tagIds)));

      if (userTags.length > 0) {
        await db.insert(deckTags).values(
          userTags.map((t) => ({ deckId, tagId: t.id }))
        );
      }
    }
  }

  return c.json({ deck: serializeDeck(updatedDeck) }, 200);
});

// DELETE /:id - Delete deck
decksOpenAPI.openapi(deleteDeckRoute, async (c) => {
  const user = c.get("user");
  const { id: deckId } = c.req.valid("param");

  const [deck] = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, user.userId)))
    .limit(1);

  if (!deck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  // Cascade delete handled by DB constraints
  await db.delete(decks).where(eq(decks.id, deckId));

  return c.json({ success: true }, 200);
});

// ============================================
// Flashcard CRUD Handlers
// ============================================

// GET /:id/cards - List cards in deck
decksOpenAPI.openapi(listCardsRoute, async (c) => {
  const user = c.get("user");
  const { id: deckId } = c.req.valid("param");
  const query = c.req.valid("query");

  const limit = Math.min(100, parseInt(query.limit || "50", 10));
  const offset = parseInt(query.offset || "0", 10);

  const [deck] = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, user.userId)))
    .limit(1);

  if (!deck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  // Get cards with optional highlight and book info
  const cardsData = await db
    .select({
      card: flashcards,
      highlight: {
        id: highlights.id,
        content: highlights.content,
      },
      book: {
        id: books.id,
        title: books.title,
      }
    })
    .from(flashcards)
    .leftJoin(highlights, eq(flashcards.highlightId, highlights.id))
    .leftJoin(books, eq(highlights.bookId, books.id))
    .where(eq(flashcards.deckId, deckId))
    .orderBy(desc(flashcards.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db.execute(sql`
    SELECT count(*)::int as count FROM flashcards WHERE deck_id = ${deckId}
  `);

  return c.json({
    cards: cardsData.map(({ card, highlight, book }) => serializeCard(card, highlight && book ? {
      id: highlight.id,
      content: highlight.content,
      bookTitle: book.title,
      bookId: book.id
    } : undefined)),
    total: Number((countResult as { count: number }).count || 0),
  }, 200);
});

// POST /:id/cards - Create card
decksOpenAPI.openapi(createCardRoute, async (c) => {
  const user = c.get("user");
  const { id: deckId } = c.req.valid("param");
  const body = c.req.valid("json");

  const [deck] = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, user.userId)))
    .limit(1);

  if (!deck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  if (deck.type === "smart") {
    return c.json({ error: "Cannot manually add cards to a smart deck" }, 400);
  }

  // Verify highlight if provided
  let highlightId: string | null = null;
  if (body.highlightId) {
    const [hl] = await db
      .select()
      .from(highlights)
      .where(and(eq(highlights.id, body.highlightId), eq(highlights.userId, user.userId)))
      .limit(1);

    if (!hl) {
      return c.json({ error: "Highlight not found" }, 404);
    }
    highlightId = hl.id;
  }

  const [newCard] = await db
    .insert(flashcards)
    .values({
      deckId,
      userId: user.userId,
      highlightId,
      front: body.front,
      back: body.back,
      cardType: body.cardType ?? "basic",
      // New cards start with no FSRS data (state 0)
      fsrsData: null,
      dueAt: new Date(), // Due immediately for first review
    })
    .returning();

  return c.json({ card: serializeCard(newCard) }, 201);
});

// PATCH /cards/:cardId - Update card
decksOpenAPI.openapi(updateCardRoute, async (c) => {
  const user = c.get("user");
  const { cardId } = c.req.valid("param");
  const body = c.req.valid("json");

  const [card] = await db
    .select()
    .from(flashcards)
    .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, user.userId)))
    .limit(1);

  if (!card) {
    return c.json({ error: "Card not found" }, 404);
  }

  const updateData: Partial<typeof flashcards.$inferInsert> = { updatedAt: new Date() };
  if (body.front !== undefined) updateData.front = body.front;
  if (body.back !== undefined) updateData.back = body.back;
  if (body.cardType !== undefined) updateData.cardType = body.cardType;

  const [updatedCard] = await db
    .update(flashcards)
    .set(updateData)
    .where(eq(flashcards.id, cardId))
    .returning();

  return c.json({ card: serializeCard(updatedCard) }, 200);
});

// DELETE /cards/:cardId - Delete card
decksOpenAPI.openapi(deleteCardRoute, async (c) => {
  const user = c.get("user");
  const { cardId } = c.req.valid("param");

  const [card] = await db
    .select()
    .from(flashcards)
    .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, user.userId)))
    .limit(1);

  if (!card) {
    return c.json({ error: "Card not found" }, 404);
  }

  await db.delete(flashcards).where(eq(flashcards.id, cardId));

  return c.json({ success: true }, 200);
});

// ============================================
// Study Session Handlers
// ============================================

// GET /:id/study - Get study session
decksOpenAPI.openapi(getStudySessionRoute, async (c) => {
  const user = c.get("user");
  const { id: deckId } = c.req.valid("param");
  const query = c.req.valid("query");

  const limit = Math.min(50, parseInt(query.limit || "20", 10));

  const [deck] = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, user.userId)))
    .limit(1);

  if (!deck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  const now = new Date();
  const studyItems: Array<{
    id: string;
    front: string;
    back: string;
    cardType: "basic" | "cloze";
    isVirtual: boolean;
    highlightId: string | null;
    deckId: string | null;
    highlight: { id: string; bookId: string; bookTitle: string } | null;
  }> = [];

  if (deck.type === "manual") {
    // Simple case: get due cards from this deck
    const dueCards = await db
      .select({
        card: flashcards,
        highlight: { id: highlights.id, bookId: highlights.bookId },
        book: { title: books.title }
      })
      .from(flashcards)
      .leftJoin(highlights, eq(flashcards.highlightId, highlights.id))
      .leftJoin(books, eq(highlights.bookId, books.id))
      .where(and(eq(flashcards.deckId, deckId), lte(flashcards.dueAt, now)))
      .orderBy(flashcards.dueAt)
      .limit(limit);

    for (const { card, highlight, book } of dueCards) {
      studyItems.push({
        id: card.id,
        front: card.front,
        back: card.back,
        cardType: card.cardType,
        isVirtual: false,
        highlightId: card.highlightId,
        deckId: card.deckId,
        highlight: highlight && book ? {
          id: highlight.id,
          bookId: highlight.bookId,
          bookTitle: book.title
        } : null
      });
    }
  } else {
    // Smart deck: find cards linked to highlights with matching tags
    const deckTagIds = await db
      .select({ tagId: deckTags.tagId })
      .from(deckTags)
      .where(eq(deckTags.deckId, deckId));

    if (deckTagIds.length === 0) {
      return c.json({ cards: [], totalDue: 0 }, 200);
    }

    const tagIds = deckTagIds.map((t) => t.tagId);
    const settings = deck.settings as { includeRawHighlights?: boolean } | null;

    // Find highlights with matching tags
    const matchingHighlightIds = await db
      .select({ highlightId: highlightTags.highlightId })
      .from(highlightTags)
      .where(inArray(highlightTags.tagId, tagIds));

    const hlIds = [...new Set(matchingHighlightIds.map((h) => h.highlightId))];

    if (hlIds.length === 0) {
      return c.json({ cards: [], totalDue: 0 }, 200);
    }

    // Get due flashcards linked to these highlights
    const dueCards = await db
      .select({
        card: flashcards,
        highlight: { id: highlights.id, bookId: highlights.bookId },
        book: { title: books.title }
      })
      .from(flashcards)
      .leftJoin(highlights, eq(flashcards.highlightId, highlights.id))
      .leftJoin(books, eq(highlights.bookId, books.id))
      .where(
        and(
          eq(flashcards.userId, user.userId),
          inArray(flashcards.highlightId, hlIds),
          lte(flashcards.dueAt, now)
        )
      )
      .orderBy(flashcards.dueAt)
      .limit(limit);

    for (const { card, highlight, book } of dueCards) {
      studyItems.push({
        id: card.id,
        front: card.front,
        back: card.back,
        cardType: card.cardType,
        isVirtual: false,
        highlightId: card.highlightId,
        deckId: card.deckId,
        highlight: highlight && book ? {
          id: highlight.id,
          bookId: highlight.bookId,
          bookTitle: book.title
        } : null
      });
    }

    // If settings include raw highlights, add virtual cards
    if (settings?.includeRawHighlights && studyItems.length < limit) {
      // Find highlights without flashcards
      const existingHlIds = await db
        .select({ highlightId: flashcards.highlightId })
        .from(flashcards)
        .where(
          and(
            eq(flashcards.userId, user.userId),
            inArray(flashcards.highlightId, hlIds)
          )
        );

      const coveredHlIds = new Set(existingHlIds.filter((h) => h.highlightId).map((h) => h.highlightId as string));
      const uncoveredHlIds = hlIds.filter((id) => !coveredHlIds.has(id));

      if (uncoveredHlIds.length > 0) {
        const rawHighlights = await db
          .select({
            id: highlights.id,
            content: highlights.content,
            bookId: highlights.bookId,
            bookTitle: books.title,
          })
          .from(highlights)
          .innerJoin(books, eq(highlights.bookId, books.id))
          .where(inArray(highlights.id, uncoveredHlIds.slice(0, limit - studyItems.length)));

        for (const hl of rawHighlights) {
          studyItems.push({
            id: `virtual:${hl.id}`,
            front: hl.content.slice(0, 100) + (hl.content.length > 100 ? "..." : ""),
            back: hl.content,
            cardType: "basic",
            isVirtual: true,
            highlightId: hl.id,
            deckId: null,
            highlight: {
              id: hl.id,
              bookId: hl.bookId,
              bookTitle: hl.bookTitle
            }
          });
        }
      }
    }
  }

  // Count total due
  const [totalResult] = await db.execute(sql`
    SELECT count(*)::int as count
    FROM flashcards
    WHERE user_id = ${user.userId}
    AND deck_id = ${deckId}
    AND due_at <= NOW()
  `);

  return c.json({
    cards: studyItems,
    totalDue: Number((totalResult as { count: number }).count || 0),
  }, 200);
});

// POST /cards/:cardId/review - Submit review
decksOpenAPI.openapi(submitReviewRoute, async (c) => {
  const user = c.get("user");
  const { cardId } = c.req.valid("param");
  const { rating } = c.req.valid("json");

  const [card] = await db
    .select()
    .from(flashcards)
    .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, user.userId)))
    .limit(1);

  if (!card) {
    return c.json({ error: "Card not found" }, 404);
  }

  const currentFsrs = card.fsrsData as { stability: number; difficulty: number; due: string; state: number; lastReview: string | null } | null;
  const newFsrs = calculateNextReview(currentFsrs, rating);

  await db
    .update(flashcards)
    .set({
      fsrsData: newFsrs,
      dueAt: new Date(newFsrs.due),
      updatedAt: new Date(),
    })
    .where(eq(flashcards.id, cardId));

  return c.json({
    nextDue: newFsrs.due,
    fsrsData: newFsrs,
  }, 200);
});

// POST /virtual-cards/:highlightId/review - Submit virtual card review
decksOpenAPI.openapi(submitVirtualReviewRoute, async (c) => {
  const user = c.get("user");
  const { highlightId } = c.req.valid("param");
  const body = c.req.valid("json");

  // Find the highlight
  const [highlight] = await db
    .select({
      id: highlights.id,
      content: highlights.content,
      bookTitle: books.title,
    })
    .from(highlights)
    .innerJoin(books, eq(highlights.bookId, books.id))
    .where(and(eq(highlights.id, highlightId), eq(highlights.userId, user.userId)))
    .limit(1);

  if (!highlight) {
    return c.json({ error: "Highlight not found" }, 404);
  }

  // Verify deck exists and belongs to user
  const [deck] = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, body.deckId), eq(decks.userId, user.userId)))
    .limit(1);

  if (!deck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  // Calculate FSRS for first review
  const fsrsData = calculateNextReview(null, body.rating);

  // Create the real flashcard
  const [newCard] = await db
    .insert(flashcards)
    .values({
      deckId: body.deckId,
      userId: user.userId,
      highlightId,
      front: body.front || highlight.content.slice(0, 100) + (highlight.content.length > 100 ? "..." : ""),
      back: body.back || highlight.content,
      cardType: "basic",
      fsrsData,
      dueAt: new Date(fsrsData.due),
    })
    .returning();

  return c.json({
    card: serializeCard(newCard, {
      id: highlight.id,
      content: highlight.content,
      bookTitle: highlight.bookTitle,
    }),
    nextDue: fsrsData.due,
  }, 201);
});
