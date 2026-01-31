import type { ExportProvider, ExportResult, BookWithHighlights, ExportOptions } from "../types";

export class MarkdownExporter implements ExportProvider {
  id = "markdown";
  name = "Markdown";
  description = "Export highlights as Markdown files with YAML frontmatter";
  icon = "📝";
  fileExtension = ".md";
  requiresAuth = false;

  async export(
    books: BookWithHighlights[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const includeNotes = options.includeNotes ?? true;

    if (books.length === 1) {
      // Single book - return single file
      const content = this.generateMarkdown(books[0], includeNotes);
      const filename = this.sanitizeFilename(books[0].title) + ".md";

      return {
        type: "file",
        data: content,
        contentType: "text/markdown; charset=utf-8",
        filename,
      };
    }

    // Multiple books - generate combined markdown or zip
    // For simplicity, we'll create a combined file with separators
    const sections = books.map((book) => this.generateMarkdown(book, includeNotes));
    const combined = sections.join("\n\n---\n\n");

    return {
      type: "file",
      data: combined,
      contentType: "text/markdown; charset=utf-8",
      filename: "lektr-export.md",
    };
  }

  private generateMarkdown(book: BookWithHighlights, includeNotes: boolean): string {
    const lines: string[] = [];

    // YAML Frontmatter
    lines.push("---");
    lines.push(`title: "${this.escapeYaml(book.title)}"`);
    if (book.author) {
      lines.push(`author: "${this.escapeYaml(book.author)}"`);
    }
    lines.push(`highlights: ${book.highlights.length}`);
    lines.push(`exported: "${new Date().toISOString()}"`);
    lines.push("---");
    lines.push("");

    // Title
    lines.push(`# ${book.title}`);
    if (book.author) {
      lines.push(`*by ${book.author}*`);
    }
    lines.push("");
    lines.push(`**${book.highlights.length} highlights**`);
    lines.push("");

    // Highlights
    for (const highlight of book.highlights) {
      // Quote block
      lines.push(`> ${highlight.content.replace(/\n/g, "\n> ")}`);
      
      // Location info
      const location: string[] = [];
      if (highlight.chapter) location.push(highlight.chapter);
      if (highlight.page) location.push(`Page ${highlight.page}`);
      if (location.length > 0) {
        lines.push(`> — *${location.join(", ")}*`);
      }
      lines.push("");

      // Note
      if (includeNotes && highlight.note) {
        lines.push(`**Note:** ${highlight.note}`);
        lines.push("");
      }
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
