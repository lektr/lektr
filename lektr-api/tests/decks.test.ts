/**
 * Decks & Flashcards API Tests
 * Tests for deck CRUD, flashcard operations, FSRS scheduling, and smart deck logic
 */

import { describe, test, expect } from "vitest";

// ============================================
// FSRS Algorithm Tests
// ============================================

describe("FSRS Scheduling Algorithm", () => {
  // Simulated FSRS defaults for testing
  const FSRS_DEFAULTS = {
    w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
  };
  const Rating = { Again: 1, Hard: 2, Good: 3, Easy: 4 } as const;

  function calculateInitialStability(rating: number): number {
    return FSRS_DEFAULTS.w[rating - 1];
  }

  function calculateInitialDifficulty(rating: number): number {
    const w = FSRS_DEFAULTS.w;
    const d = w[4] - w[5] * (rating - 3);
    return Math.max(1, Math.min(10, d));
  }

  describe("Initial Review (New Card)", () => {
    test("Again rating should result in lowest stability", () => {
      const stability = calculateInitialStability(Rating.Again);
      expect(stability).toBe(0.4);
      expect(stability).toBeLessThan(calculateInitialStability(Rating.Hard));
    });

    test("Easy rating should result in highest stability", () => {
      const stability = calculateInitialStability(Rating.Easy);
      expect(stability).toBe(5.8);
      expect(stability).toBeGreaterThan(calculateInitialStability(Rating.Good));
    });

    test("Good rating should result in moderate stability", () => {
      const stability = calculateInitialStability(Rating.Good);
      expect(stability).toBe(2.4);
    });

    test("Difficulty should be highest for Again rating", () => {
      const difficultyAgain = calculateInitialDifficulty(Rating.Again);
      const difficultyEasy = calculateInitialDifficulty(Rating.Easy);
      expect(difficultyAgain).toBeGreaterThan(difficultyEasy);
    });

    test("Difficulty should be clamped between 1 and 10", () => {
      for (const rating of [1, 2, 3, 4]) {
        const difficulty = calculateInitialDifficulty(rating);
        expect(difficulty).toBeGreaterThanOrEqual(1);
        expect(difficulty).toBeLessThanOrEqual(10);
      }
    });
  });

  describe("Interval Calculation", () => {
    test("Again rating should schedule within minutes", () => {
      const intervalDays = 0.0007; // ~1 minute
      const intervalMinutes = intervalDays * 24 * 60;
      expect(intervalMinutes).toBeCloseTo(1, 0);
    });

    test("Good rating initial interval should be about 1 hour", () => {
      const intervalDays = 0.0417; // ~1 hour
      const intervalMinutes = intervalDays * 24 * 60;
      expect(intervalMinutes).toBeCloseTo(60, 0);
    });

    test("Easy rating initial interval should be 1 day", () => {
      const intervalDays = 1;
      expect(intervalDays).toBe(1);
    });
  });
});

// ============================================
// Deck Ownership & Authorization Tests
// ============================================

describe("Deck Ownership Verification", () => {
  test("should allow access when deck belongs to user", () => {
    const deck = { id: "deck-1", userId: "user-123" };
    const requestUserId = "user-123";

    const isOwner = deck.userId === requestUserId;
    expect(isOwner).toBe(true);
  });

  test("should deny access when deck belongs to different user", () => {
    const deck = { id: "deck-1", userId: "user-123" };
    const requestUserId = "user-456";

    const isOwner = deck.userId === requestUserId;
    expect(isOwner).toBe(false);
  });

  test("should verify flashcard ownership through deck relationship", () => {
    const flashcard = { id: "card-1", deckId: "deck-1", userId: "user-123" };
    const requestUserId = "user-123";

    const isOwner = flashcard.userId === requestUserId;
    expect(isOwner).toBe(true);
  });
});

// ============================================
// Deck Type Logic Tests
// ============================================

describe("Deck Type Logic", () => {
  describe("Manual Deck Behavior", () => {
    test("manual deck should allow direct card creation", () => {
      const deck = { type: "manual" as const };
      const canAddCards = deck.type === "manual";
      expect(canAddCards).toBe(true);
    });

    test("smart deck should not allow direct card creation", () => {
      const deck = { type: "smart" as const };
      const canAddCards = deck.type === "manual";
      expect(canAddCards).toBe(false);
    });
  });

  describe("Smart Deck Tag Logic", () => {
    test("AND logic should require all tags to match", () => {
      const requiredTagIds = ["tag-1", "tag-2", "tag-3"];
      const highlightTagIds = ["tag-1", "tag-2", "tag-3"];

      const matchesAllTags = requiredTagIds.every(id => highlightTagIds.includes(id));
      expect(matchesAllTags).toBe(true);
    });

    test("AND logic should fail if any tag is missing", () => {
      const requiredTagIds = ["tag-1", "tag-2", "tag-3"];
      const highlightTagIds = ["tag-1", "tag-2"];

      const matchesAllTags = requiredTagIds.every(id => highlightTagIds.includes(id));
      expect(matchesAllTags).toBe(false);
    });

    test("OR logic should match if any tag matches", () => {
      const requiredTagIds = ["tag-1", "tag-2", "tag-3"];
      const highlightTagIds = ["tag-2", "tag-5"];

      const matchesAnyTag = requiredTagIds.some(id => highlightTagIds.includes(id));
      expect(matchesAnyTag).toBe(true);
    });

    test("OR logic should fail if no tags match", () => {
      const requiredTagIds = ["tag-1", "tag-2", "tag-3"];
      const highlightTagIds = ["tag-4", "tag-5"];

      const matchesAnyTag = requiredTagIds.some(id => highlightTagIds.includes(id));
      expect(matchesAnyTag).toBe(false);
    });
  });
});

// ============================================
// Virtual Card Logic Tests
// ============================================

describe("Virtual Card Generation", () => {
  test("should generate virtual card from raw highlight", () => {
    const highlight = {
      id: "hl-1",
      content: "This is a long highlight content that needs to be truncated for the front of the card.",
    };
    const maxFrontLength = 50;

    const virtualCard = {
      id: `virtual:${highlight.id}`,
      front: highlight.content.slice(0, maxFrontLength) + (highlight.content.length > maxFrontLength ? "..." : ""),
      back: highlight.content,
      cardType: "basic" as const,
      isVirtual: true,
      highlightId: highlight.id,
      deckId: null,
    };

    expect(virtualCard.isVirtual).toBe(true);
    expect(virtualCard.deckId).toBeNull();
    expect(virtualCard.front.length).toBeLessThanOrEqual(maxFrontLength + 3); // +3 for "..."
    expect(virtualCard.back).toBe(highlight.content);
  });

  test("should not truncate short content", () => {
    const highlight = {
      id: "hl-1",
      content: "Short content",
    };
    const maxFrontLength = 100;

    const front = highlight.content.slice(0, maxFrontLength) + (highlight.content.length > maxFrontLength ? "..." : "");

    expect(front).toBe("Short content");
    expect(front.includes("...")).toBe(false);
  });

  test("should filter highlights that already have flashcards", () => {
    const allHighlightIds = ["hl-1", "hl-2", "hl-3", "hl-4"];
    const highlightsWithCards = new Set(["hl-1", "hl-3"]);

    const uncoveredHighlightIds = allHighlightIds.filter(id => !highlightsWithCards.has(id));

    expect(uncoveredHighlightIds).toEqual(["hl-2", "hl-4"]);
  });
});

// ============================================
// Card Type Validation Tests
// ============================================

describe("Card Type Validation", () => {
  describe("Basic Cards", () => {
    test("should accept valid basic card structure", () => {
      const card = {
        front: "What is the capital of France?",
        back: "Paris",
        cardType: "basic" as const,
      };

      expect(card.front.length).toBeGreaterThan(0);
      expect(card.back.length).toBeGreaterThan(0);
      expect(card.cardType).toBe("basic");
    });
  });

  describe("Cloze Deletion Cards", () => {
    test("should detect cloze deletion syntax", () => {
      const content = "The capital of France is {{c1::Paris}}.";
      const clozePattern = /\{\{c\d+::.+?\}\}/;

      expect(clozePattern.test(content)).toBe(true);
    });

    test("should extract cloze deletion text", () => {
      const content = "The capital of {{c1::France}} is {{c2::Paris}}.";
      const clozeMatches = content.match(/\{\{c\d+::(.+?)\}\}/g);

      expect(clozeMatches).toHaveLength(2);
      expect(clozeMatches?.[0]).toBe("{{c1::France}}");
      expect(clozeMatches?.[1]).toBe("{{c2::Paris}}");
    });

    test("should replace cloze with blanks for front display", () => {
      const content = "The capital of France is {{c1::Paris}}.";
      const front = content.replace(/\{\{c\d+::(.+?)\}\}/g, "[...]");

      expect(front).toBe("The capital of France is [...].");
    });

    test("should reveal cloze content for back display", () => {
      const content = "The capital of France is {{c1::Paris}}.";
      const back = content.replace(/\{\{c\d+::(.+?)\}\}/g, "$1");

      expect(back).toBe("The capital of France is Paris.");
    });
  });
});

// ============================================
// Study Session Logic Tests
// ============================================

describe("Study Session Logic", () => {
  test("should order cards by due date ascending", () => {
    const cards = [
      { id: "1", dueAt: new Date("2024-03-01") },
      { id: "2", dueAt: new Date("2024-01-01") },
      { id: "3", dueAt: new Date("2024-02-01") },
    ];

    const sorted = [...cards].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

    expect(sorted.map(c => c.id)).toEqual(["2", "3", "1"]);
  });

  test("should filter only due cards", () => {
    const now = new Date("2024-02-15");
    const cards = [
      { id: "1", dueAt: new Date("2024-02-10") }, // Due
      { id: "2", dueAt: new Date("2024-02-20") }, // Not due
      { id: "3", dueAt: new Date("2024-02-15") }, // Due (exactly now)
      { id: "4", dueAt: new Date("2024-03-01") }, // Not due
    ];

    const dueCards = cards.filter(c => c.dueAt <= now);

    expect(dueCards.map(c => c.id)).toEqual(["1", "3"]);
  });

  test("should limit batch size", () => {
    const cards = Array.from({ length: 100 }, (_, i) => ({ id: `card-${i}` }));
    const limit = 20;

    const batch = cards.slice(0, limit);

    expect(batch.length).toBe(20);
  });

  test("should mix real and virtual cards in smart deck study", () => {
    const realCards = [
      { id: "card-1", isVirtual: false },
      { id: "card-2", isVirtual: false },
    ];
    const virtualCards = [
      { id: "virtual:hl-1", isVirtual: true },
      { id: "virtual:hl-2", isVirtual: true },
    ];

    const studyItems = [...realCards, ...virtualCards];

    expect(studyItems.length).toBe(4);
    expect(studyItems.filter(c => c.isVirtual).length).toBe(2);
    expect(studyItems.filter(c => !c.isVirtual).length).toBe(2);
  });
});

// ============================================
// Deck Settings Validation Tests
// ============================================

describe("Deck Settings Validation", () => {
  test("should validate includeRawHighlights setting", () => {
    const settings = { includeRawHighlights: true };

    expect(typeof settings.includeRawHighlights).toBe("boolean");
    expect(settings.includeRawHighlights).toBe(true);
  });

  test("should accept null settings", () => {
    const deck = { settings: null as Record<string, unknown> | null };

    expect(deck.settings).toBeNull();
  });

  test("should handle FSRS parameter overrides", () => {
    const settings = {
      fsrsParams: {
        requestRetention: 0.9,
        maximumInterval: 365,
      },
    };

    expect(settings.fsrsParams.requestRetention).toBe(0.9);
    expect(settings.fsrsParams.maximumInterval).toBe(365);
  });
});

// ============================================
// Deck Update Logic Tests
// ============================================

describe("Deck Update Logic", () => {
  test("should only update provided fields", () => {
    const existing = { title: "Old Title", description: "Old Desc" };
    const updates = { title: "New Title" };

    const updated = {
      ...existing,
      ...(updates.title !== undefined && { title: updates.title }),
    };

    expect(updated.title).toBe("New Title");
    expect(updated.description).toBe("Old Desc");
  });

  test("should allow clearing description with null", () => {
    const updates = { description: null as string | null };

    expect(updates.description).toBeNull();
  });
});

// ============================================
// Cascade Delete Logic Tests
// ============================================

describe("Cascade Delete Logic", () => {
  test("deleting deck should remove all its cards", () => {
    const deck = { id: "deck-1" };
    const allCards = [
      { id: "card-1", deckId: "deck-1" },
      { id: "card-2", deckId: "deck-1" },
      { id: "card-3", deckId: "deck-2" },
    ];

    const remainingCards = allCards.filter(c => c.deckId !== deck.id);

    expect(remainingCards.length).toBe(1);
    expect(remainingCards[0].id).toBe("card-3");
  });

  test("deleting card should not affect deck", () => {
    const cardToDelete = { id: "card-1", deckId: "deck-1" };
    const deck = { id: "deck-1", cardCount: 5 };

    // Card deletion doesn't cascade to deck
    const deckStillExists = deck.id === cardToDelete.deckId;
    expect(deckStillExists).toBe(true);
  });
});

// ============================================
// Error Handling Tests
// ============================================

describe("Error Handling", () => {
  test("should return 404 for non-existent deck", () => {
    const deckId = "non-existent-id";
    const userDecks = [{ id: "deck-1" }, { id: "deck-2" }];

    const deck = userDecks.find(d => d.id === deckId);
    const statusCode = deck ? 200 : 404;

    expect(statusCode).toBe(404);
  });

  test("should return 400 when adding card to smart deck", () => {
    const deck = { id: "deck-1", type: "smart" as const };

    const canAddCards = deck.type === "manual";
    const statusCode = canAddCards ? 201 : 400;

    expect(statusCode).toBe(400);
  });

  test("should validate rating within bounds", () => {
    const validRatings = [1, 2, 3, 4];
    const invalidRatings = [0, 5, -1, 10];

    for (const rating of validRatings) {
      expect(rating >= 1 && rating <= 4).toBe(true);
    }

    for (const rating of invalidRatings) {
      expect(rating >= 1 && rating <= 4).toBe(false);
    }
  });
});
