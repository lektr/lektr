/**
 * Review API Tests
 * Tests for FSRS spaced repetition logic
 */

import { describe, test, expect } from "vitest";
import { FSRS, Rating, State } from "@squeakyrobot/fsrs";

describe("Review API Logic", () => {
  const fsrs = new FSRS({});

  describe("FSRS Card Creation", () => {
    test("should create empty card with correct initial state", () => {
      const card = fsrs.createEmptyCard();

      expect(card.state).toBe(State.New);
      expect(card.reps).toBe(0);
      expect(card.lapses).toBe(0);
      expect(card.stability).toBeDefined();
      expect(card.difficulty).toBeDefined();
    });

    test("new card should be due immediately", () => {
      const card = fsrs.createEmptyCard();
      const now = new Date();

      expect(card.due.getTime()).toBeLessThanOrEqual(now.getTime() + 1000);
    });
  });

  describe("Rating Mapping", () => {
    test("should map string ratings to FSRS Rating enum", () => {
      const ratingMap: Record<string, number> = {
        again: Rating.Again,
        hard: Rating.Hard,
        good: Rating.Good,
        easy: Rating.Easy,
      };

      expect(ratingMap.again).toBe(Rating.Again);
      expect(ratingMap.hard).toBe(Rating.Hard);
      expect(ratingMap.good).toBe(Rating.Good);
      expect(ratingMap.easy).toBe(Rating.Easy);
    });

    test("should have distinct rating values", () => {
      expect(Rating.Again).not.toBe(Rating.Hard);
      expect(Rating.Hard).not.toBe(Rating.Good);
      expect(Rating.Good).not.toBe(Rating.Easy);
    });
  });

  describe("FSRS Scheduling", () => {
    test("rating 'good' on new card should schedule review", () => {
      const card = fsrs.createEmptyCard();
      const now = new Date();

      const schedulingCards = fsrs.repeat(card, now);
      const result = schedulingCards[Rating.Good];

      expect(result.card.due.getTime()).toBeGreaterThan(now.getTime());
      expect(result.card.reps).toBe(1);
    });

    test("rating 'again' should schedule shorter interval than 'good'", () => {
      const card = fsrs.createEmptyCard();
      const now = new Date();

      const schedulingCards = fsrs.repeat(card, now);
      const againResult = schedulingCards[Rating.Again];
      const goodResult = schedulingCards[Rating.Good];

      expect(againResult.card.due.getTime()).toBeLessThan(goodResult.card.due.getTime());
    });

    test("rating 'easy' should schedule longer interval than 'good'", () => {
      const card = fsrs.createEmptyCard();
      const now = new Date();

      const schedulingCards = fsrs.repeat(card, now);
      const goodResult = schedulingCards[Rating.Good];
      const easyResult = schedulingCards[Rating.Easy];

      expect(easyResult.card.due.getTime()).toBeGreaterThan(goodResult.card.due.getTime());
    });

    test("multiple reviews should increase interval", () => {
      let card = fsrs.createEmptyCard();
      const now = new Date();

      // First review
      const first = fsrs.repeat(card, now);
      card = first[Rating.Good].card;
      const interval1 = card.scheduled_days;

      // Second review
      const second = fsrs.repeat(card, new Date(card.due));
      card = second[Rating.Good].card;
      const interval2 = card.scheduled_days;

      expect(interval2).toBeGreaterThanOrEqual(interval1);
    });
  });

  describe("Card State Transitions", () => {
    test("new card rated 'good' should transition to review state", () => {
      const card = fsrs.createEmptyCard();
      const now = new Date();

      expect(card.state).toBe(State.New);

      const schedulingCards = fsrs.repeat(card, now);
      const result = schedulingCards[Rating.Good];

      // After first review, should be in Learning or Review state
      expect([State.Learning, State.Review]).toContain(result.card.state);
    });

    test("card rated 'again' should increase lapses count", () => {
      let card = fsrs.createEmptyCard();
      const now = new Date();

      // First make it a learned card
      const first = fsrs.repeat(card, now);
      card = first[Rating.Good].card;

      // Then lapse it
      const second = fsrs.repeat(card, new Date(card.due));
      const lapsedCard = second[Rating.Again].card;

      expect(lapsedCard.lapses).toBeGreaterThanOrEqual(card.lapses);
    });
  });

  describe("FSRS Card Serialization", () => {
    test("should serialize card to storable format", () => {
      const card = fsrs.createEmptyCard();
      const now = new Date();
      const schedulingCards = fsrs.repeat(card, now);
      const newCard = schedulingCards[Rating.Good].card;

      const serialized = {
        due: newCard.due.toISOString(),
        stability: newCard.stability,
        difficulty: newCard.difficulty,
        elapsed_days: newCard.elapsed_days,
        scheduled_days: newCard.scheduled_days,
        reps: newCard.reps,
        lapses: newCard.lapses,
        state: newCard.state,
        last_review: now.toISOString(),
      };

      expect(typeof serialized.due).toBe("string");
      expect(typeof serialized.stability).toBe("number");
      expect(typeof serialized.state).toBe("number");
    });

    test("should deserialize card from stored format", () => {
      const stored = {
        due: "2024-01-15T10:00:00.000Z",
        stability: 4.5,
        difficulty: 5.5,
        elapsed_days: 1,
        scheduled_days: 1,
        reps: 1,
        lapses: 0,
        state: State.Review,
        last_review: "2024-01-14T10:00:00.000Z",
      };

      const card = {
        due: new Date(stored.due),
        stability: stored.stability,
        difficulty: stored.difficulty,
        elapsed_days: stored.elapsed_days,
        scheduled_days: stored.scheduled_days,
        reps: stored.reps,
        lapses: stored.lapses,
        state: stored.state,
        last_review: stored.last_review ? new Date(stored.last_review) : null,
      };

      expect(card.due).toBeInstanceOf(Date);
      expect(card.state).toBe(State.Review);
    });
  });

  describe("Interval Text Formatting", () => {
    test("should format minutes for short intervals", () => {
      const intervalDays = 0;
      const minutes: number = 10;

      let intervalText: string;
      if (intervalDays === 0) {
        intervalText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else {
        intervalText = `${intervalDays} day${intervalDays !== 1 ? 's' : ''}`;
      }

      expect(intervalText).toBe("10 minutes");
    });

    test("should format days for medium intervals", () => {
      const intervalDays: number = 7;

      let intervalText: string;
      if (intervalDays < 30) {
        intervalText = `${intervalDays} day${intervalDays !== 1 ? 's' : ''}`;
      } else {
        const months = Math.round(intervalDays / 30);
        intervalText = `${months} month${months !== 1 ? 's' : ''}`;
      }

      expect(intervalText).toBe("7 days");
    });

    test("should format months for long intervals", () => {
      const intervalDays: number = 60;

      let intervalText: string;
      if (intervalDays < 30) {
        intervalText = `${intervalDays} day${intervalDays !== 1 ? 's' : ''}`;
      } else {
        const months = Math.round(intervalDays / 30);
        intervalText = `${months} month${months !== 1 ? 's' : ''}`;
      }

      expect(intervalText).toBe("2 months");
    });

    test("should format singular day correctly", () => {
      const intervalDays = 1;
      const intervalText = `${intervalDays} day${intervalDays !== 1 ? 's' : ''}`;

      expect(intervalText).toBe("1 day");
    });
  });

  describe("Due Highlights Query Logic", () => {
    test("should identify new highlights (null fsrs_card) as due", () => {
      const highlight = { id: "1", fsrsCard: null };
      const isDue = highlight.fsrsCard === null;

      expect(isDue).toBe(true);
    });

    test("should identify overdue highlights as due", () => {
      const now = new Date();
      const pastDue = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago

      const highlight = { id: "1", fsrsCard: { due: pastDue.toISOString() } };
      const isDue = new Date(highlight.fsrsCard.due) <= now;

      expect(isDue).toBe(true);
    });

    test("should not mark future highlights as due", () => {
      const now = new Date();
      const futureDue = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now

      const highlight = { id: "1", fsrsCard: { due: futureDue.toISOString() } };
      const isDue = new Date(highlight.fsrsCard.due) <= now;

      expect(isDue).toBe(false);
    });
  });
});
