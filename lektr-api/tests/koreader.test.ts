import { describe, test, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { KOReaderImporter } from "../src/importers/koreader";

describe("KOReaderImporter", () => {
  let importer: KOReaderImporter;

  beforeAll(() => {
    importer = new KOReaderImporter();
  });

  describe("validate", () => {
    test("accepts .json files", async () => {
      const file = new File(['{"title": "Test"}'], "metadata.json", {
        type: "application/json",
      });
      expect(await importer.validate(file)).toBe(true);
    });

    test("accepts .lua files with valid JSON content", async () => {
      const file = new File(['{"title": "Test"}'], "metadata.lua", {
        type: "text/plain",
      });
      expect(await importer.validate(file)).toBe(true);
    });

    test("rejects non-json/lua files", async () => {
      const file = new File(["some content"], "file.txt", {
        type: "text/plain",
      });
      expect(await importer.validate(file)).toBe(false);
    });

    test("rejects invalid JSON content", async () => {
      const file = new File(["not valid json {{{"], "metadata.json", {
        type: "application/json",
      });
      expect(await importer.validate(file)).toBe(false);
    });
  });

  describe("parse - modern format (JSON/1.0.0 with entries)", () => {
    test("parses live KOReader export", async () => {
      const sampleJson = readFileSync(
        path.resolve(__dirname, "fixtures/live-example.json"),
        "utf-8"
      );
      const file = new File([sampleJson], "export.json", {
        type: "application/json",
      });

      const books = await importer.parse(file);

      expect(books).toHaveLength(1);
      expect(books[0].title).toBe("How to Read a Book");
      expect(books[0].author).toBe("Mortimer J. Adler");
      expect(books[0].highlights).toHaveLength(2);
    });

    test("extracts highlight content and metadata from entries", async () => {
      const sampleJson = readFileSync(
        path.resolve(__dirname, "fixtures/live-example.json"),
        "utf-8"
      );
      const file = new File([sampleJson], "export.json", {
        type: "application/json",
      });

      const books = await importer.parse(file);
      const firstHighlight = books[0].highlights[0];

      expect(firstHighlight.content).toContain("How to Read a Book was first published");
      expect(firstHighlight.chapter).toBe("Preface");
      expect(firstHighlight.page).toBe(10);
      expect(firstHighlight.highlightedAt).toBeInstanceOf(Date);
    });

    test("uses md5sum as externalId", async () => {
      const sampleJson = readFileSync(
        path.resolve(__dirname, "fixtures/live-example.json"),
        "utf-8"
      );
      const file = new File([sampleJson], "export.json", {
        type: "application/json",
      });

      const books = await importer.parse(file);
      expect(books[0].externalId).toBe("bb34589c95c4fc540d7d1da6c89d2d2d");
    });
  });

  describe("parse - legacy format", () => {
    test("parses legacy format with highlight object", async () => {
      const sampleJson = readFileSync(
        path.resolve(__dirname, "fixtures/koreader-sample.json"),
        "utf-8"
      );
      const file = new File([sampleJson], "metadata.json", {
        type: "application/json",
      });

      const books = await importer.parse(file);

      expect(books).toHaveLength(1);
      expect(books[0].title).toBe("The Art of Learning");
      expect(books[0].author).toBe("Josh Waitzkin");
      expect(books[0].highlights).toHaveLength(4);
    });

    test("parses multiple books from array", async () => {
      const sampleJson = readFileSync(
        path.resolve(__dirname, "fixtures/koreader-multiple-books.json"),
        "utf-8"
      );
      const file = new File([sampleJson], "metadata.json", {
        type: "application/json",
      });

      const books = await importer.parse(file);

      expect(books).toHaveLength(2);
      expect(books[0].title).toBe("Atomic Habits");
      expect(books[1].title).toBe("Deep Work");
    });
  });

  describe("edge cases", () => {
    test("handles book with no highlights", async () => {
      const json = JSON.stringify({
        title: "Empty Book",
        author: "Unknown",
        entries: [],
      });
      const file = new File([json], "metadata.json", {
        type: "application/json",
      });

      const books = await importer.parse(file);

      expect(books).toHaveLength(1);
      expect(books[0].title).toBe("Empty Book");
      expect(books[0].highlights).toHaveLength(0);
    });

    test("uses 'Untitled' for missing title", async () => {
      const json = JSON.stringify({
        entries: [{ text: "Some text", sort: "highlight" }],
      });
      const file = new File([json], "metadata.json", {
        type: "application/json",
      });

      const books = await importer.parse(file);

      expect(books[0].title).toBe("Untitled");
    });

    test("converts unix timestamp to Date", async () => {
      const json = JSON.stringify({
        title: "Test",
        entries: [{ text: "Test highlight", time: 1769399418, sort: "highlight" }],
      });
      const file = new File([json], "metadata.json", {
        type: "application/json",
      });

      const books = await importer.parse(file);
      const date = books[0].highlights[0].highlightedAt;

      expect(date).toBeInstanceOf(Date);
      // Verify it's a reasonable future date (2026)
      expect(date!.getFullYear()).toBe(2026);
    });
  });
});
