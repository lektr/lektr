import { describe, expect, it } from "bun:test";
import { KindleImporter } from "../src/importers/kindle";

describe("KindleImporter", () => {
  const importer = new KindleImporter();

  describe("validate", () => {
    it("should accept .txt files with Kindle separator", async () => {
      const file = new File(
        ["Some content\n==========\nMore content"],
        "My Clippings.txt",
        { type: "text/plain" }
      );
      expect(await importer.validate(file)).toBe(true);
    });

    it("should reject non-.txt files", async () => {
      const file = new File(["content"], "highlights.json", {
        type: "application/json",
      });
      expect(await importer.validate(file)).toBe(false);
    });

    it("should reject .txt files without Kindle separator", async () => {
      const file = new File(["Just regular text content"], "notes.txt", {
        type: "text/plain",
      });
      expect(await importer.validate(file)).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse a simple Kindle clipping", async () => {
      const content = `The Great Gatsby (F. Scott Fitzgerald)
- Your Highlight on page 42 | Location 512-515 | Added on Monday, January 15, 2024 10:30:00 AM

In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.
==========`;

      const file = new File([content], "My Clippings.txt", {
        type: "text/plain",
      });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("The Great Gatsby");
      expect(result[0].author).toBe("F. Scott Fitzgerald");
      expect(result[0].highlights).toHaveLength(1);
      expect(result[0].highlights[0].content).toContain("In my younger");
      expect(result[0].highlights[0].page).toBe(42);
    });

    it("should group multiple highlights from the same book", async () => {
      const content = `1984 (George Orwell)
- Your Highlight on page 1 | Location 10-15 | Added on Monday, January 1, 2024 9:00:00 AM

It was a bright cold day in April, and the clocks were striking thirteen.
==========
1984 (George Orwell)
- Your Highlight on page 5 | Location 50-55 | Added on Monday, January 1, 2024 9:05:00 AM

War is peace. Freedom is slavery. Ignorance is strength.
==========`;

      const file = new File([content], "My Clippings.txt", {
        type: "text/plain",
      });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("1984");
      expect(result[0].highlights).toHaveLength(2);
    });

    it("should handle multiple books", async () => {
      const content = `Book One (Author A)
- Your Highlight on page 1 | Location 10 | Added on Monday, January 1, 2024 9:00:00 AM

Highlight from book one.
==========
Book Two (Author B)
- Your Highlight on page 1 | Location 10 | Added on Monday, January 1, 2024 9:00:00 AM

Highlight from book two.
==========`;

      const file = new File([content], "My Clippings.txt", {
        type: "text/plain",
      });
      const result = await importer.parse(file);

      expect(result).toHaveLength(2);
      expect(result.map((b) => b.title).sort()).toEqual(["Book One", "Book Two"]);
    });

    it("should skip notes and bookmarks (only import highlights)", async () => {
      const content = `Test Book (Test Author)
- Your Note on page 10 | Location 100 | Added on Monday, January 1, 2024 9:00:00 AM

This is a note, not a highlight.
==========
Test Book (Test Author)
- Your Bookmark on page 20 | Location 200 | Added on Monday, January 1, 2024 9:00:00 AM


==========
Test Book (Test Author)
- Your Highlight on page 30 | Location 300 | Added on Monday, January 1, 2024 9:00:00 AM

This is the actual highlight.
==========`;

      const file = new File([content], "My Clippings.txt", {
        type: "text/plain",
      });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].highlights).toHaveLength(1);
      expect(result[0].highlights[0].content).toBe("This is the actual highlight.");
    });

    it("should handle books without author in parentheses", async () => {
      const content = `Some Document Title
- Your Highlight on page 5 | Location 50 | Added on Monday, January 1, 2024 9:00:00 AM

A highlight from a document without author.
==========`;

      const file = new File([content], "My Clippings.txt", {
        type: "text/plain",
      });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Some Document Title");
      expect(result[0].author).toBeUndefined();
    });
  });
});
