import type { BaseImporter } from "./base";
import type { ParsedBook, ParsedHighlight, SourceType } from "../types";

/**
 * KindleImporter - Parses Kindle "My Clippings.txt" export files.
 *
 * Format example:
 * ```
 * Book Title (Author Name)
 * - Your Highlight on page 123 | Location 1234-1256 | Added on Sunday, January 1, 2023 12:34:56 PM
 *
 * The actual highlight text goes here.
 * ==========
 * ```
 *
 * Each entry is separated by "==========" and contains:
 * 1. Book title with author in parentheses
 * 2. Metadata line (type, page, location, date)
 * 3. Empty line
 * 4. Content
 * 5. Separator
 */
export class KindleImporter implements BaseImporter {
  readonly sourceType: SourceType = "kindle";

  async validate(file: File): Promise<boolean> {
    // Kindle clippings are .txt files
    if (!file.name.toLowerCase().endsWith(".txt")) {
      return false;
    }

    try {
      const content = await file.text();
      // Check for the distinctive Kindle separator
      return content.includes("==========");
    } catch {
      return false;
    }
  }

  async parse(file: File): Promise<ParsedBook[]> {
    const content = await file.text();
    const entries = this.splitEntries(content);

    // Group entries by book
    const bookMap = new Map<string, { title: string; author?: string; highlights: ParsedHighlight[] }>();

    for (const entry of entries) {
      const parsed = this.parseEntry(entry);
      if (!parsed) continue;

      const { bookTitle, author, highlight } = parsed;
      const bookKey = `${bookTitle}|||${author || ""}`;

      if (!bookMap.has(bookKey)) {
        bookMap.set(bookKey, {
          title: bookTitle,
          author,
          highlights: [],
        });
      }

      bookMap.get(bookKey)!.highlights.push(highlight);
    }

    // Convert map to array of ParsedBook
    return Array.from(bookMap.values()).map((book) => ({
      title: book.title,
      author: book.author,
      highlights: book.highlights,
    }));
  }

  /**
   * Split the clippings file into individual entries.
   */
  private splitEntries(content: string): string[] {
    return content
      .split("==========")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
  }

  /**
   * Parse a single clipping entry.
   */
  private parseEntry(entry: string): {
    bookTitle: string;
    author?: string;
    highlight: ParsedHighlight;
  } | null {
    const lines = entry.split("\n").map((l) => l.trim());

    if (lines.length < 3) {
      return null;
    }

    // First line: "Book Title (Author Name)" or just "Book Title"
    const titleLine = lines[0];
    const { title, author } = this.parseTitleLine(titleLine);

    // Second line: metadata "- Your Highlight on page X | Location Y | Added on Z"
    const metaLine = lines[1];
    const meta = this.parseMetaLine(metaLine);

    // Skip notes, bookmarks without content - only process highlights
    if (!meta || meta.type !== "highlight") {
      return null;
    }

    // Content starts after the empty line (line index 2+)
    // Sometimes there's an empty line, sometimes not
    const contentLines = lines.slice(2).filter((l) => l.length > 0);
    const content = contentLines.join(" ").trim();

    if (!content) {
      return null;
    }

    return {
      bookTitle: title,
      author,
      highlight: {
        content,
        page: meta.page,
        highlightedAt: meta.addedAt,
      },
    };
  }

  /**
   * Parse the title line to extract book title and author.
   * Format: "Book Title (Author Name)" or just "Book Title"
   */
  private parseTitleLine(line: string): { title: string; author?: string } {
    // Match "(Author Name)" at the end
    const authorMatch = line.match(/\(([^)]+)\)\s*$/);

    if (authorMatch) {
      const author = authorMatch[1].trim();
      const title = line.slice(0, line.lastIndexOf("(")).trim();
      return { title, author };
    }

    return { title: line.trim() };
  }

  /**
   * Parse the metadata line.
   * Examples:
   * - "- Your Highlight on page 123 | Location 1234-1256 | Added on Sunday, January 1, 2023 12:34:56 PM"
   * - "- Your Note on Location 1234 | Added on Sunday, January 1, 2023 12:34:56 PM"
   * - "- Your Bookmark on page 123 | Location 1234 | Added on Sunday, January 1, 2023 12:34:56 PM"
   */
  private parseMetaLine(line: string): {
    type: "highlight" | "note" | "bookmark";
    page?: number;
    location?: string;
    addedAt?: Date;
  } | null {
    if (!line.startsWith("-")) {
      return null;
    }

    // Determine type
    let type: "highlight" | "note" | "bookmark" = "highlight";
    if (line.toLowerCase().includes("your note")) {
      type = "note";
    } else if (line.toLowerCase().includes("your bookmark")) {
      type = "bookmark";
    } else if (!line.toLowerCase().includes("your highlight")) {
      return null;
    }

    // Extract page number
    const pageMatch = line.match(/page\s+(\d+)/i);
    const page = pageMatch ? parseInt(pageMatch[1], 10) : undefined;

    // Extract location
    const locationMatch = line.match(/Location\s+([\d-]+)/i);
    const location = locationMatch ? locationMatch[1] : undefined;

    // Extract date
    const dateMatch = line.match(/Added on\s+(.+)$/i);
    let addedAt: Date | undefined;
    if (dateMatch) {
      try {
        addedAt = new Date(dateMatch[1]);
        // Validate parsed date
        if (isNaN(addedAt.getTime())) {
          addedAt = undefined;
        }
      } catch {
        addedAt = undefined;
      }
    }

    return { type, page, location, addedAt };
  }
}
