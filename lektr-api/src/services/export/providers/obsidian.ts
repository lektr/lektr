import type { ExportProvider, ExportResult, BookWithHighlights, ExportOptions } from "../types";

export class ObsidianExporter implements ExportProvider {
  id = "obsidian";
  name = "Obsidian";
  description = "Export highlights as Obsidian-compatible Markdown with wikilinks and properties";
  icon = "💎";
  fileExtension = ".md";
  requiresAuth = false;

  async export(
    books: BookWithHighlights[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const includeNotes = options.includeNotes ?? true;
    const includeTags = options.includeTags ?? true;

    if (books.length === 1) {
      const content = this.generateObsidianMarkdown(books[0], includeNotes, includeTags);
      const filename = this.sanitizeFilename(books[0].title) + ".md";

      return {
        type: "file",
        data: content,
        contentType: "text/markdown; charset=utf-8",
        filename,
      };
    }

    // Multiple books - combined with clear separators
    const sections = books.map((book) => 
      this.generateObsidianMarkdown(book, includeNotes, includeTags)
    );
    const combined = sections.join("\n\n---\n\n");

    return {
      type: "file",
      data: combined,
      contentType: "text/markdown; charset=utf-8",
      filename: "lektr-obsidian-export.md",
    };
  }

  private generateObsidianMarkdown(
    book: BookWithHighlights,
    includeNotes: boolean,
    includeTags: boolean
  ): string {
    const lines: string[] = [];

    // Obsidian Properties (YAML Frontmatter)
    lines.push("---");
    lines.push(`title: "${this.escapeYaml(book.title)}"`);
    if (book.author) {
      lines.push(`author: "[[${this.escapeYaml(book.author)}]]"`);
    }
    lines.push(`type: book-highlights`);
    lines.push(`highlights: ${book.highlights.length}`);
    lines.push(`created: ${new Date().toISOString().split("T")[0]}`);
    lines.push("tags:");
    lines.push("  - highlights");
    lines.push("  - reading");
    lines.push("---");
    lines.push("");

    // Title with author link
    lines.push(`# ${book.title}`);
    if (book.author) {
      lines.push(`Author: [[${book.author}]]`);
    }
    lines.push("");

    // Highlights section
    lines.push("## Highlights");
    lines.push("");

    for (const highlight of book.highlights) {
      // Callout block for highlight
      lines.push(`> [!quote]`);
      const contentLines = highlight.content.split("\n");
      for (const line of contentLines) {
        lines.push(`> ${line}`);
      }

      // Location
      const location: string[] = [];
      if (highlight.chapter) location.push(highlight.chapter);
      if (highlight.page) location.push(`p. ${highlight.page}`);
      if (location.length > 0) {
        lines.push(`> `);
        lines.push(`> — ${location.join(" · ")}`);
      }
      lines.push("");

      // Note as nested callout
      if (includeNotes && highlight.note) {
        lines.push(`> [!note] My thoughts`);
        lines.push(`> ${highlight.note.replace(/\n/g, "\n> ")}`);
        lines.push("");
      }

      // Tags as inline tags
      // if (includeTags && highlight.tags?.length) {
      //   const tagStr = highlight.tags.map((t) => `#${t.name.replace(/\s/g, "-")}`).join(" ");
      //   lines.push(tagStr);
      //   lines.push("");
      // }
    }

    return lines.join("\n");
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[/\\?%*:|"<>]/g, "-")
      .replace(/\s+/g, "_")
      .substring(0, 100);
  }

  private escapeYaml(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\n/g, " ");
  }
}
