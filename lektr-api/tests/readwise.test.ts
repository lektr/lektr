/**
 * Readwise Importer Tests
 * 
 * Tests for the Readwise CSV importer.
 */
import { describe, expect, it } from "bun:test";
import { ReadwiseImporter } from "../src/importers/readwise";

describe("ReadwiseImporter", () => {
  const importer = new ReadwiseImporter();

  describe("validate", () => {
    it("should accept .csv files with required headers", async () => {
      const content = `Highlight,Title,Author,Note,Location
"This is a highlight","Test Book","Test Author","A note","10"`;
      const file = new File([content], "readwise-export.csv", {
        type: "text/csv",
      });
      expect(await importer.validate(file)).toBe(true);
    });

    it("should accept Book Title header variation", async () => {
      const content = `Highlight,Book Title,Book Author
"A quote","My Book","Author Name"`;
      const file = new File([content], "export.csv", {
        type: "text/csv",
      });
      expect(await importer.validate(file)).toBe(true);
    });

    it("should reject non-.csv files", async () => {
      const file = new File(["content"], "highlights.txt", {
        type: "text/plain",
      });
      expect(await importer.validate(file)).toBe(false);
    });

    it("should reject CSV without highlight header", async () => {
      const content = `Title,Author,Note
"Test Book","Test Author","Note"`;
      const file = new File([content], "invalid.csv", {
        type: "text/csv",
      });
      expect(await importer.validate(file)).toBe(false);
    });

    it("should reject CSV without title header", async () => {
      const content = `Highlight,Author,Note
"Some quote","Author","Note"`;
      const file = new File([content], "invalid.csv", {
        type: "text/csv",
      });
      expect(await importer.validate(file)).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse a simple Readwise export", async () => {
      const content = `Highlight,Title,Author,Note,Location,Highlighted At
"In my younger and more vulnerable years","The Great Gatsby","F. Scott Fitzgerald","Great opening","42","2024-01-15T10:30:00Z"`;
      const file = new File([content], "readwise.csv", {
        type: "text/csv",
      });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("The Great Gatsby");
      expect(result[0].author).toBe("F. Scott Fitzgerald");
      expect(result[0].highlights).toHaveLength(1);
      expect(result[0].highlights[0].content).toContain("In my younger");
      expect(result[0].highlights[0].note).toBe("Great opening");
      expect(result[0].highlights[0].page).toBe(42);
    });

    it("should group multiple highlights from the same book", async () => {
      const content = `Highlight,Title,Author
"First quote","1984","George Orwell"
"Second quote","1984","George Orwell"
"Third quote","1984","George Orwell"`;
      const file = new File([content], "readwise.csv", {
        type: "text/csv",
      });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("1984");
      expect(result[0].highlights).toHaveLength(3);
    });

    it("should handle multiple books", async () => {
      const content = `Highlight,Title,Author
"Quote from book one","Book One","Author A"
"Quote from book two","Book Two","Author B"`;
      const file = new File([content], "readwise.csv", {
        type: "text/csv",
      });
      const result = await importer.parse(file);

      expect(result).toHaveLength(2);
      expect(result.map((b) => b.title).sort()).toEqual(["Book One", "Book Two"]);
    });

    it("should handle highlights without author", async () => {
      const content = `Highlight,Title
"A web article quote","Some Web Article"`;
      const file = new File([content], "readwise.csv", {
        type: "text/csv",
      });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Some Web Article");
      expect(result[0].author).toBeUndefined();
    });

    it("should handle quoted fields with commas", async () => {
      const content = `Highlight,Title,Author
"Hello, World! And more","Book, With Comma","Last, First"`;
      const file = new File([content], "readwise.csv", {
        type: "text/csv",
      });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Book, With Comma");
      expect(result[0].author).toBe("Last, First");
      expect(result[0].highlights[0].content).toBe("Hello, World! And more");
    });

    it("should handle escaped quotes in fields", async () => {
      const content = `Highlight,Title,Author
"He said ""Hello""","Book Title","Author"`;
      const file = new File([content], "readwise.csv", {
        type: "text/csv",
      });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].highlights[0].content).toBe('He said "Hello"');
    });

    it("should handle empty rows", async () => {
      const content = `Highlight,Title,Author
"Quote one","Book","Author"

"Quote two","Book","Author"
`;
      const file = new File([content], "readwise.csv", {
        type: "text/csv",
      });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].highlights).toHaveLength(2);
    });

    it("should skip rows with empty highlight", async () => {
      const content = `Highlight,Title,Author
"","Empty Book","Author"
"Valid quote","Valid Book","Author"`;
      const file = new File([content], "readwise.csv", {
        type: "text/csv",
      });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Valid Book");
    });

    it("should parse dates correctly", async () => {
      const content = `Highlight,Title,Highlighted At
"A quote","Book","2024-06-15T14:30:00Z"`;
      const file = new File([content], "readwise.csv", {
        type: "text/csv",
      });
      const result = await importer.parse(file);

      expect(result[0].highlights[0].highlightedAt).toBeInstanceOf(Date);
    });

    it("should use 'Untitled' for missing title", async () => {
      const content = `Highlight,Title,Author
"A quote","","Some Author"`;
      const file = new File([content], "readwise.csv", {
        type: "text/csv",
      });
      const result = await importer.parse(file);

      expect(result[0].title).toBe("Untitled");
    });
  });
});
