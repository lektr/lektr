import type { BaseImporter } from "./base";
import type { ParsedBook, ParsedHighlight, SourceType } from "../types";

/**
 * LektrImporter - Parses Lektr's own markdown export format.
 *
 * Format exported by the Markdown exporter:
 * ```markdown
 * ---
 * title: "Book Title"
 * author: "Author Name"
 * highlights: 5
 * exported: "2024-01-01T00:00:00.000Z"
 * ---
 *
 * # Book Title
 * *by Author Name*
 *
 * **5 highlights**
 *
 * > Highlight content here
 * > — *Chapter Name, Page 42*
 *
 * **Note:** Optional note text
 *
 * ---
 *
 * (next book section starts with frontmatter or separator)
 * ```
 */
export class LektrImporter implements BaseImporter {
  readonly sourceType: SourceType = "lektr";

  async validate(file: File): Promise<boolean> {
    // Lektr exports are .md files
    if (!file.name.toLowerCase().endsWith(".md")) {
      return false;
    }

    try {
      const content = await file.text();
      // Check for Lektr frontmatter pattern: starts with --- and has title:
      const hasFrontmatter = content.trimStart().startsWith("---");
      const hasTitle = /^title:\s*["']?.+["']?$/m.test(content);
      return hasFrontmatter && hasTitle;
    } catch {
      return false;
    }
  }

  async parse(file: File): Promise<ParsedBook[]> {
    const content = await file.text();
    const bookSections = this.splitBooks(content);
    
    const books: ParsedBook[] = [];
    for (const section of bookSections) {
      const parsed = this.parseBookSection(section);
      if (parsed) {
        books.push(parsed);
      }
    }

    return books;
  }

  /**
   * Split the markdown content into individual book sections.
   * Books are separated by horizontal rules (---) between them,
   * but we need to distinguish from frontmatter separators.
   */
  private splitBooks(content: string): string[] {
    // The export format separates books with "\n\n---\n\n"
    // But each book also starts with frontmatter "---"
    // Split by the book separator pattern
    const sections = content.split(/\n\n---\n\n/);
    
    return sections
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.includes("---"));
  }

  /**
   * Parse a single book section.
   */
  private parseBookSection(section: string): ParsedBook | null {
    // Extract frontmatter
    const frontmatterMatch = section.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return null;
    }

    const frontmatter = this.parseFrontmatter(frontmatterMatch[1]);
    if (!frontmatter.title) {
      return null;
    }

    // Get content after frontmatter
    const bodyStart = section.indexOf("---", 3) + 3;
    const body = section.slice(bodyStart).trim();

    // Parse highlights from body
    const highlights = this.parseHighlights(body);

    return {
      title: frontmatter.title,
      author: frontmatter.author,
      highlights,
    };
  }

  /**
   * Parse YAML frontmatter.
   */
  private parseFrontmatter(yaml: string): { title?: string; author?: string } {
    const result: { title?: string; author?: string } = {};

    for (const line of yaml.split("\n")) {
      const titleMatch = line.match(/^title:\s*["']?(.+?)["']?\s*$/);
      if (titleMatch) {
        result.title = titleMatch[1].replace(/\\"/g, '"');
      }

      const authorMatch = line.match(/^author:\s*["']?(.+?)["']?\s*$/);
      if (authorMatch) {
        result.author = authorMatch[1].replace(/\\"/g, '"');
      }
    }

    return result;
  }

  /**
   * Parse highlights from the markdown body.
   */
  private parseHighlights(body: string): ParsedHighlight[] {
    const highlights: ParsedHighlight[] = [];

    // Split by blockquote starts - each highlight starts with ">"
    // Pattern: > content\n> — *location*\n\n**Note:** note text
    const lines = body.split("\n");
    
    let currentHighlight: { content: string[]; chapter?: string; page?: number } | null = null;
    let currentNote: string | null = null;
    let inBlockquote = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Line is part of a blockquote
      if (line.startsWith("> ")) {
        const quoteLine = line.slice(2);

        // Check if this is the location line (starts with —)
        if (quoteLine.startsWith("— *") || quoteLine.startsWith("— ")) {
          // Location line: — *Chapter, Page 42*
          if (currentHighlight) {
            const locationInfo = this.parseLocationLine(quoteLine);
            currentHighlight.chapter = locationInfo.chapter;
            currentHighlight.page = locationInfo.page;
          }
        } else if (inBlockquote && currentHighlight) {
          // Continuation of current highlight
          currentHighlight.content.push(quoteLine);
        } else {
          // If we have a previous highlight waiting to be saved, save it
          if (currentHighlight) {
            highlights.push(this.buildHighlight(currentHighlight, currentNote));
            currentNote = null;
          }
          
          // Start new highlight
          currentHighlight = { content: [quoteLine] };
          inBlockquote = true;
        }
      } else if (line.startsWith(">")) {
        // Empty continuation of blockquote
        if (currentHighlight) {
          currentHighlight.content.push("");
        }
      } else if (line.startsWith("**Note:**") && currentHighlight) {
        // Note line
        currentNote = line.slice(9).trim();
        inBlockquote = false;
      } else if (line === "") {
        // Empty line - end of blockquote section
        inBlockquote = false;
      } else if (line.startsWith("**") && line.includes("highlights**")) {
        // Skip the "X highlights" line
        inBlockquote = false;
        continue;
      } else if (line.startsWith("# ") || line.startsWith("*by ")) {
        // Skip title and author lines
        inBlockquote = false;
        continue;
      } else {
        inBlockquote = false;
      }
    }

    // Don't forget the last highlight
    if (currentHighlight) {
      highlights.push(this.buildHighlight(currentHighlight, currentNote));
    }

    return highlights;
  }

  /**
   * Parse location line like "— *Chapter 1, Page 42*" or "— *Page 42*"
   */
  private parseLocationLine(line: string): { chapter?: string; page?: number } {
    const result: { chapter?: string; page?: number } = {};

    // Remove "— " prefix and asterisks
    const content = line.replace(/^—\s*\*?/, "").replace(/\*$/, "").trim();

    // Check for "Page X" pattern
    const pageMatch = content.match(/Page\s+(\d+)/i);
    if (pageMatch) {
      result.page = parseInt(pageMatch[1], 10);
    }

    // Everything before ", Page" is the chapter (if exists)
    const pageIndex = content.toLowerCase().indexOf(", page");
    if (pageIndex > 0) {
      result.chapter = content.slice(0, pageIndex).trim();
    } else if (!pageMatch) {
      // No page found, entire content might be chapter
      result.chapter = content;
    }

    return result;
  }

  /**
   * Build a ParsedHighlight from accumulated data.
   */
  private buildHighlight(
    data: { content: string[]; chapter?: string; page?: number },
    note: string | null
  ): ParsedHighlight {
    return {
      content: data.content.join("\n").trim(),
      chapter: data.chapter,
      page: data.page,
      note: note || undefined,
    };
  }
}
