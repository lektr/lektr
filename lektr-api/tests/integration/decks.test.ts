/**
 * Decks API Integration Tests
 *
 * Tests HTTP behavior of deck and flashcard endpoints including:
 * - Authentication requirements
 * - Deck CRUD (create, read, update, delete)
 * - Card creation (manual deck vs smart deck)
 * - Study session retrieval
 * - Card review submission
 * - Security: IDOR prevention, user isolation
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { mockDb } from "../mocks/db";

// Mock dependencies
vi.mock("../../src/db", () => ({ db: mockDb }));

vi.mock("../../src/middleware/auth", () => ({
  authMiddleware: async (c: any, next: any) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const userId = c.req.header("x-mock-user-id") || "user-1";
    c.set("user", { userId, email: `${userId}@test.com`, role: "user" });
    await next();
  },
}));

describe("Decks API", () => {
  let app: Hono;

  beforeEach(async () => {
    mockDb.$reset();

    const { decksOpenAPI } = await import("../../src/openapi/decks.handlers");
    app = new Hono();
    app.route("/decks", decksOpenAPI);
  });

  // ============================================
  // AUTHENTICATION
  // ============================================
  describe("Authentication", () => {
    test("GET /decks should return 401 without auth", async () => {
      const res = await app.request("/decks");
      expect(res.status).toBe(401);
    });

    test("POST /decks should return 401 without auth", async () => {
      const res = await app.request("/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test Deck" }),
      });
      expect(res.status).toBe(401);
    });

    test("GET /decks/:id should return 401 without auth", async () => {
      const res = await app.request("/decks/deck-1");
      expect(res.status).toBe(401);
    });

    test("DELETE /decks/:id should return 401 without auth", async () => {
      const res = await app.request("/decks/deck-1", { method: "DELETE" });
      expect(res.status).toBe(401);
    });
  });

  // ============================================
  // LIST DECKS
  // ============================================
  describe("GET /decks", () => {
    test("should return empty array when no decks", async () => {
      mockDb.$setResponse([]);
      // Card counts and due counts (execute calls)
      mockDb.$queueExecuteResponses([[], []]);

      const res = await app.request("/decks", {
        headers: { Authorization: "Bearer token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.decks).toEqual([]);
    });

    test("should return decks with card counts", async () => {
      const mockDeck = {
        id: "deck-1",
        title: "Study Deck",
        description: "Test",
        type: "manual",
        tagLogic: null,
        settings: null,
        userId: "user-1",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        deletedAt: null,
      };
      mockDb.$setResponse([mockDeck]);
      mockDb.$queueExecuteResponses([
        [{ deck_id: "deck-1", count: 5 }],
        [{ deck_id: "deck-1", count: 2 }],
      ]);

      const res = await app.request("/decks", {
        headers: { Authorization: "Bearer token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.decks).toHaveLength(1);
      expect(body.decks[0].id).toBe("deck-1");
      expect(body.decks[0].cardCount).toBe(5);
      expect(body.decks[0].dueCount).toBe(2);
    });
  });

  // ============================================
  // CREATE DECK
  // ============================================
  describe("POST /decks", () => {
    test("should create a manual deck", async () => {
      const createdDeck = {
        id: "new-deck",
        title: "My Deck",
        description: null,
        type: "manual",
        tagLogic: null,
        settings: null,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockDb.$setResponse([createdDeck]);

      const res = await app.request("/decks", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "My Deck" }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.deck.title).toBe("My Deck");
      expect(body.deck.type).toBe("manual");
    });
  });

  // ============================================
  // GET SINGLE DECK
  // ============================================
  describe("GET /decks/:id", () => {
    test("should return 404 for non-existent deck", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/decks/non-existent", {
        headers: { Authorization: "Bearer token" },
      });

      expect(res.status).toBe(404);
    });

    test("should return deck for valid owner", async () => {
      const mockDeck = {
        id: "deck-1",
        title: "My Deck",
        description: null,
        type: "manual",
        tagLogic: null,
        settings: null,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockDb.$setResponse([mockDeck]);
      // Card count and due count
      mockDb.$queueExecuteResponses([
        [{ count: 3 }],
        [{ count: 1 }],
      ]);

      const res = await app.request("/decks/deck-1", {
        headers: { Authorization: "Bearer token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.deck.id).toBe("deck-1");
    });
  });

  // ============================================
  // UPDATE DECK
  // ============================================
  describe("PATCH /decks/:id", () => {
    test("should return 404 for non-existent deck", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/decks/non-existent", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Updated" }),
      });

      expect(res.status).toBe(404);
    });

    test("should update deck title", async () => {
      const existingDeck = {
        id: "deck-1",
        title: "Old Title",
        description: null,
        type: "manual",
        tagLogic: null,
        settings: null,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      // First call: select existing, second call: update returning
      mockDb.$queueResponses([
        [existingDeck],
        [{ ...existingDeck, title: "Updated Title" }],
      ]);

      const res = await app.request("/decks/deck-1", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Updated Title" }),
      });

      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // DELETE DECK
  // ============================================
  describe("DELETE /decks/:id", () => {
    test("should return 404 for non-existent deck", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/decks/non-existent", {
        method: "DELETE",
        headers: { Authorization: "Bearer token" },
      });

      expect(res.status).toBe(404);
    });

    test("should soft-delete deck for valid owner", async () => {
      mockDb.$setResponse([{
        id: "deck-1",
        title: "My Deck",
        userId: "user-1",
        type: "manual",
        tagLogic: null,
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }]);

      const res = await app.request("/decks/deck-1", {
        method: "DELETE",
        headers: { Authorization: "Bearer token" },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  // ============================================
  // CARDS
  // ============================================
  describe("POST /decks/:id/cards", () => {
    test("should return 404 for non-existent deck", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/decks/non-existent/cards", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ front: "Q", back: "A" }),
      });

      expect(res.status).toBe(404);
    });

    test("should return 400 when adding card to smart deck", async () => {
      mockDb.$setResponse([{
        id: "deck-smart",
        title: "Smart Deck",
        type: "smart",
        tagLogic: "AND",
        settings: null,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }]);

      const res = await app.request("/decks/deck-smart/cards", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ front: "Q", back: "A" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("smart deck");
    });

    test("should create card in manual deck", async () => {
      const newCard = {
        id: "card-1",
        deckId: "deck-1",
        userId: "user-1",
        highlightId: null,
        front: "Question",
        back: "Answer",
        cardType: "basic",
        fsrsData: null,
        dueAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      // First: select deck, second: insert card
      mockDb.$queueResponses([
        [{ id: "deck-1", title: "Manual", type: "manual", tagLogic: null, settings: null, userId: "user-1", createdAt: new Date(), updatedAt: new Date(), deletedAt: null }],
        [newCard],
      ]);

      const res = await app.request("/decks/deck-1/cards", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ front: "Question", back: "Answer" }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.card.front).toBe("Question");
      expect(body.card.back).toBe("Answer");
    });
  });

  // ============================================
  // CARD REVIEW
  // ============================================
  describe("POST /decks/cards/:cardId/review", () => {
    test("should return 404 for non-existent card", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/decks/cards/non-existent/review", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating: 3 }),
      });

      expect(res.status).toBe(404);
    });

    test("should submit review and return next due date", async () => {
      mockDb.$setResponse([{
        id: "card-1",
        deckId: "deck-1",
        userId: "user-1",
        highlightId: null,
        front: "Q",
        back: "A",
        cardType: "basic",
        fsrsData: null,
        dueAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }]);

      const res = await app.request("/decks/cards/card-1/review", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating: 3 }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.nextDue).toBeDefined();
      expect(body.fsrsData).toBeDefined();
    });
  });

  // ============================================
  // SECURITY
  // ============================================
  describe("Security", () => {
    test("cannot access another user's deck (IDOR)", async () => {
      // Handler queries with WHERE userId = user-1, returns empty for user-2's deck
      mockDb.$setResponse([]);

      const res = await app.request("/decks/user2-deck", {
        headers: {
          Authorization: "Bearer token",
          "x-mock-user-id": "user-1",
        },
      });

      expect(res.status).toBe(404);
    });

    test("cannot delete another user's deck (IDOR)", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/decks/user2-deck", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer token",
          "x-mock-user-id": "user-1",
        },
      });

      expect(res.status).toBe(404);
    });

    test("cannot modify another user's deck (IDOR)", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/decks/user2-deck", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token",
          "x-mock-user-id": "user-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Hacked" }),
      });

      expect(res.status).toBe(404);
    });

    test("cannot review another user's card (IDOR)", async () => {
      mockDb.$setResponse([]);

      const res = await app.request("/decks/cards/user2-card/review", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "x-mock-user-id": "user-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating: 4 }),
      });

      expect(res.status).toBe(404);
    });
  });
});
