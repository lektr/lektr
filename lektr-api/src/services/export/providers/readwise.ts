import type { ExportProvider, ExportResult, BookWithHighlights, ExportOptions } from "../types";

/**
 * Readwise CSV format columns:
 * Highlight, Title, Author, URL, Note, Location, Date
 */
export class ReadwiseExporter implements ExportProvider {
  id = "readwise";
  name = "Readwise CSV";
  description = "Export highlights as CSV compatible with Readwise import";
  icon = "📚";
  fileExtension = ".csv";
  requiresAuth = false;

  async export(
    books: BookWithHighlights[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const rows: string[][] = [];

    // Header row
    rows.push(["Highlight", "Title", "Author", "URL", "Note", "Location", "Date"]);

    for (const book of books) {
      for (const highlight of book.highlights) {
        // Readwise requires Location to be an integer (page number)
        const location = highlight.page ? highlight.page.toString() : "";

        // Readwise format: YEAR-MONTH-DAY HOUR:MINUTE:SECOND
        const date = highlight.highlightedAt
          ? new Date(highlight.highlightedAt).toISOString().replace("T", " ").split(".")[0]
          : "";

        rows.push([
          highlight.content,
          book.title,
          book.author || "",
          "", // URL - not applicable for Lektr
          highlight.note || "",
          location,
          date,
        ]);
      }
    }

    const csv = this.toCSV(rows);

    return {
      type: "file",
      data: csv,
      contentType: "text/csv; charset=utf-8",
      filename: "lektr-readwise-export.csv",
    };
  }

  private toCSV(rows: string[][]): string {
    return rows.map((row) => row.map((cell) => this.escapeCSV(cell)).join(",")).join("\n");
  }

  private escapeCSV(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
