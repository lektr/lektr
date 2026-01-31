/**
 * Normalize Utilities Unit Tests
 * 
 * Tests title and author normalization functions.
 */
import { describe, test, expect } from "bun:test";
import { normalizeTitle, normalizeAuthor, getTitleVariations } from "../../src/services/normalize";

describe("normalizeTitle", () => {
  test("should remove content in square brackets", () => {
    expect(normalizeTitle("The Book [Kindle Edition]")).toBe("The Book");
    expect(normalizeTitle("Title [Special Edition] More")).toBe("Title More");
  });

  test("should remove series info in parentheses", () => {
    expect(normalizeTitle("The Hunger Games (The Hunger Games #1)")).toBe("The Hunger Games");
    expect(normalizeTitle("Book Title (Series Book 2)")).toBe("Book Title");
    expect(normalizeTitle("Title (Volume 3)")).toBe("Title");
  });

  test("should remove subtitles after colon for long titles", () => {
    // Only titles with 3+ words or 15+ chars before colon are truncated
    expect(normalizeTitle("Atomic Habits And More: An Easy Way to Build Good Habits")).toBe("Atomic Habits And More");
    expect(normalizeTitle("The Very Long Book Title: A Subtitle")).toBe("The Very Long Book Title");
  });

  test("should keep short titles with colons", () => {
    // Short titles should not be truncated
    expect(normalizeTitle("Me: A Story")).toBe("Me: A Story");
  });

  test("should remove subtitles after long dash", () => {
    expect(normalizeTitle("Clean Code - A Handbook of Agile Software")).toBe("Clean Code");
    expect(normalizeTitle("The Design – Principles of Good Design")).toBe("The Design");
  });

  test("should remove edition/format suffixes", () => {
    expect(normalizeTitle("Book Kindle Edition")).toBe("Book");
    expect(normalizeTitle("Title Paperback")).toBe("Title");
    expect(normalizeTitle("Story eBook Edition")).toBe("Story");
  });

  test("should normalize whitespace", () => {
    expect(normalizeTitle("  Multiple   Spaces  ")).toBe("Multiple Spaces");
  });

  test("should remove leading/trailing punctuation", () => {
    expect(normalizeTitle("...Title...")).toBe("Title");
  });
});

describe("normalizeAuthor", () => {
  test("should remove common titles", () => {
    expect(normalizeAuthor("Dr. Jane Smith")).toBe("Jane Smith");
    expect(normalizeAuthor("Mr. John Doe")).toBe("John Doe");
    expect(normalizeAuthor("Prof. Albert Einstein")).toBe("Albert Einstein");
  });

  test("should normalize whitespace", () => {
    expect(normalizeAuthor("  John   Doe  ")).toBe("John Doe");
  });

  test("should handle names without titles", () => {
    expect(normalizeAuthor("Jane Austen")).toBe("Jane Austen");
  });
});

describe("getTitleVariations", () => {
  test("should return original title", () => {
    const variations = getTitleVariations("The Great Gatsby");
    expect(variations).toContain("The Great Gatsby");
  });

  test("should include normalized version", () => {
    const variations = getTitleVariations("The Great Gatsby [Kindle Edition]");
    expect(variations).toContain("The Great Gatsby");
  });

  test("should include version without 'The' prefix", () => {
    const variations = getTitleVariations("The Great Gatsby");
    expect(variations).toContain("Great Gatsby");
  });

  test("should include version without 'A' prefix", () => {
    const variations = getTitleVariations("A Brief History of Time");
    expect(variations).toContain("Brief History of Time");
  });

  test("should not include duplicates", () => {
    const variations = getTitleVariations("Simple Title");
    const unique = [...new Set(variations)];
    expect(variations.length).toBe(unique.length);
  });
});
