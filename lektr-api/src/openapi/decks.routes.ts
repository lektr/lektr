import { createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema } from "./schemas";

// ============================================
// Deck Schemas
// ============================================

const DeckSettingsSchema = z.object({
  fsrsParams: z.record(z.unknown()).optional(),
  includeRawHighlights: z.boolean().optional(),
  autoGenerateTemplate: z.string().optional(),
}).openapi("DeckSettings");

const DeckSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(["manual", "smart"]),
  tagLogic: z.enum(["AND", "OR"]).nullable(),
  settings: DeckSettingsSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  cardCount: z.number().optional(),
  dueCount: z.number().optional(),
  tags: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable(),
  })).optional(),
}).openapi("Deck");

const CreateDeckRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  type: z.enum(["manual", "smart"]).default("manual"),
  tagLogic: z.enum(["AND", "OR"]).optional(),
  tagIds: z.array(z.string()).optional(), // For smart decks
  settings: DeckSettingsSchema.optional(),
}).openapi("CreateDeckRequest");

const UpdateDeckRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  tagLogic: z.enum(["AND", "OR"]).optional(),
  tagIds: z.array(z.string()).optional(),
  settings: DeckSettingsSchema.optional(),
}).openapi("UpdateDeckRequest");

const SuccessSchema = z.object({ success: z.boolean() }).openapi("DeckSuccess");

// ============================================
// Flashcard Schemas
// ============================================

const FSRSDataSchema = z.object({
  stability: z.number(),
  difficulty: z.number(),
  due: z.string(),
  state: z.number(),
  lastReview: z.string().nullable(),
}).openapi("FSRSData");

const FlashcardSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  highlightId: z.string().nullable(),
  front: z.string(),
  back: z.string(),
  cardType: z.enum(["basic", "cloze"]),
  fsrsData: FSRSDataSchema.nullable(),
  dueAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  highlight: z.object({
    id: z.string(),
    content: z.string(),
    bookTitle: z.string().optional(),
  }).optional(),
}).openapi("Flashcard");

const CreateFlashcardRequestSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  highlightId: z.string().optional(),
  cardType: z.enum(["basic", "cloze"]).default("basic"),
}).openapi("CreateFlashcardRequest");

const UpdateFlashcardRequestSchema = z.object({
  front: z.string().min(1).optional(),
  back: z.string().min(1).optional(),
  cardType: z.enum(["basic", "cloze"]).optional(),
}).openapi("UpdateFlashcardRequest");

const ReviewRequestSchema = z.object({
  rating: z.number().min(1).max(4), // 1=Again, 2=Hard, 3=Good, 4=Easy
}).openapi("ReviewRequest");

const ReviewResponseSchema = z.object({
  nextDue: z.string(),
  fsrsData: FSRSDataSchema,
}).openapi("ReviewResponse");

// Study item can be real card or virtual (raw highlight)
const StudyItemSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  cardType: z.enum(["basic", "cloze"]),
  isVirtual: z.boolean(),
  highlightId: z.string().nullable(),
  deckId: z.string().nullable(), // null for virtual cards
}).openapi("StudyItem");

// ============================================
// Deck Route Definitions
// ============================================

export const listDecksRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Decks"],
  summary: "List all decks",
  description: "Get all decks for the authenticated user with card counts.",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "List of decks",
      content: { "application/json": { schema: z.object({ decks: z.array(DeckSchema) }) } },
    },
  },
});

export const createDeckRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Decks"],
  summary: "Create a deck",
  description: "Create a new manual or smart deck.",
  security: [{ cookieAuth: [] }],
  request: { body: { content: { "application/json": { schema: CreateDeckRequestSchema } } } },
  responses: {
    201: { description: "Deck created", content: { "application/json": { schema: z.object({ deck: DeckSchema }) } } },
    400: { description: "Invalid request", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const getDeckRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Decks"],
  summary: "Get deck details",
  description: "Get a deck with its settings and tags.",
  security: [{ cookieAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Deck details", content: { "application/json": { schema: z.object({ deck: DeckSchema }) } } },
    404: { description: "Deck not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const updateDeckRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Decks"],
  summary: "Update a deck",
  description: "Update deck title, description, settings, or smart deck tags.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: UpdateDeckRequestSchema } } },
  },
  responses: {
    200: { description: "Deck updated", content: { "application/json": { schema: z.object({ deck: DeckSchema }) } } },
    404: { description: "Deck not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const deleteDeckRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Decks"],
  summary: "Delete a deck",
  description: "Delete a deck (cascades to delete all cards for manual decks).",
  security: [{ cookieAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Deck deleted", content: { "application/json": { schema: SuccessSchema } } },
    404: { description: "Deck not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

// ============================================
// Flashcard Route Definitions
// ============================================

export const listCardsRoute = createRoute({
  method: "get",
  path: "/{id}/cards",
  tags: ["Flashcards"],
  summary: "List cards in a deck",
  description: "Get all flashcards in a manual deck (paginated).",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({
      limit: z.string().optional(),
      offset: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "List of cards",
      content: { "application/json": { schema: z.object({
        cards: z.array(FlashcardSchema),
        total: z.number(),
      }) } },
    },
    404: { description: "Deck not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const createCardRoute = createRoute({
  method: "post",
  path: "/{id}/cards",
  tags: ["Flashcards"],
  summary: "Create a flashcard",
  description: "Create a new flashcard in a deck.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: CreateFlashcardRequestSchema } } },
  },
  responses: {
    201: { description: "Card created", content: { "application/json": { schema: z.object({ card: FlashcardSchema }) } } },
    400: { description: "Cannot add cards to smart deck", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Deck not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const updateCardRoute = createRoute({
  method: "patch",
  path: "/cards/{cardId}",
  tags: ["Flashcards"],
  summary: "Update a flashcard",
  description: "Update flashcard front/back content.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ cardId: z.string() }),
    body: { content: { "application/json": { schema: UpdateFlashcardRequestSchema } } },
  },
  responses: {
    200: { description: "Card updated", content: { "application/json": { schema: z.object({ card: FlashcardSchema }) } } },
    404: { description: "Card not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const deleteCardRoute = createRoute({
  method: "delete",
  path: "/cards/{cardId}",
  tags: ["Flashcards"],
  summary: "Delete a flashcard",
  description: "Delete a flashcard.",
  security: [{ cookieAuth: [] }],
  request: { params: z.object({ cardId: z.string() }) },
  responses: {
    200: { description: "Card deleted", content: { "application/json": { schema: SuccessSchema } } },
    404: { description: "Card not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

// ============================================
// Study Session Route Definitions
// ============================================

export const getStudySessionRoute = createRoute({
  method: "get",
  path: "/{id}/study",
  tags: ["Study"],
  summary: "Get study session cards",
  description: "Get batch of due cards for study (up to 20). For smart decks, includes virtual cards from raw highlights.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({ limit: z.string().optional() }),
  },
  responses: {
    200: {
      description: "Study session cards",
      content: { "application/json": { schema: z.object({
        cards: z.array(StudyItemSchema),
        totalDue: z.number(),
      }) } },
    },
    404: { description: "Deck not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const submitReviewRoute = createRoute({
  method: "post",
  path: "/cards/{cardId}/review",
  tags: ["Study"],
  summary: "Submit card review",
  description: "Submit a review rating for a flashcard.",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ cardId: z.string() }),
    body: { content: { "application/json": { schema: ReviewRequestSchema } } },
  },
  responses: {
    200: { description: "Review recorded", content: { "application/json": { schema: ReviewResponseSchema } } },
    404: { description: "Card not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const submitVirtualReviewRoute = createRoute({
  method: "post",
  path: "/virtual-cards/{highlightId}/review",
  tags: ["Study"],
  summary: "Submit virtual card review",
  description: "Submit a review for a raw highlight (creates a real flashcard on first review).",
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ highlightId: z.string() }),
    body: { content: { "application/json": { schema: z.object({
      rating: z.number().min(1).max(4),
      deckId: z.string(), // Which deck to create the card in
      front: z.string().optional(), // Optional custom front
      back: z.string().optional(), // Optional custom back
    }) } } },
  },
  responses: {
    201: { description: "Card created and review recorded", content: { "application/json": { schema: z.object({
      card: FlashcardSchema,
      nextDue: z.string(),
    }) } } },
    404: { description: "Highlight not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});
