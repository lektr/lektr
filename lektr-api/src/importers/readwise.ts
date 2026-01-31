import type { BaseImporter } from "./base";
import type { ParsedBook, ParsedHighlight, SourceType } from "../types";

export class ReadwiseImporter implements BaseImporter {
  readonly sourceType: SourceType = "readwise";

  async validate(file: File): Promise<boolean> {
    const validExtensions = [".csv"];
    const hasValidExtension = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      return false;
    }

    try {
      const content = await file.text();
      // Simple check for required headers
      const firstLine = content.split('\n')[0].toLowerCase();
      // Readwise exports vary: "Book Title", "Title", "Article Title"
      return firstLine.includes("highlight") && 
             (firstLine.includes("title") || firstLine.includes("book title"));
    } catch {
      return false;
    }
  }

  async parse(file: File): Promise<ParsedBook[]> {
    const content = await file.text();
    const rows = this.parseCSV(content);
    
    // Header mapping (normalize to lowercase)
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const headerMap: Record<string, number> = {};
    headers.forEach((h, i) => { headerMap[h] = i; });

    // Identify dynamic column names
    const highlightCol = headerMap['highlight'];
    const titleCol = headerMap['book title'] ?? headerMap['title'] ?? headerMap['article title'];
    const authorCol = headerMap['book author'] ?? headerMap['author'];
    const noteCol = headerMap['note'];
    const locationCol = headerMap['location'];
    const dateCol = headerMap['highlighted at'] ?? headerMap['created at'] ?? headerMap['date'];

    // Validate headers
    if (highlightCol === undefined || titleCol === undefined) {
      throw new Error("Invalid Readwise CSV format: Missing 'Highlight' or 'Title' columns");
    }

    const booksMap = new Map<string, ParsedBook>();

    // Process data rows (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2) continue; // Skip empty rows

      const highlightContent = this.getVal(row, highlightCol);
      const title = this.getVal(row, titleCol) || "Untitled";
      const author = this.getVal(row, authorCol);
      const note = this.getVal(row, noteCol);
      const location = this.getVal(row, locationCol);
      const dateStr = this.getVal(row, dateCol);
      
      if (!highlightContent) continue;

      // Group by Title + Author to form Unique ID for grouping
      const bookKey = `${title}|${author || ''}`;

      if (!booksMap.has(bookKey)) {
        booksMap.set(bookKey, {
          title,
          author: author || undefined,
          externalId: undefined, // Readwise doesn't give a stable ID, we'll let Lektr dedup by title/author
          highlights: [],
          metadata: {
            source_import: "readwise_csv"
          }
        });
      }

      const book = booksMap.get(bookKey)!;

      // Parse Location (Page)
      // Readwise export says "Location Type" = "page" typically
      let page: number | undefined;
      if (location && /^\d+$/.test(location.trim())) {
        page = parseInt(location.trim(), 10);
      }

      // Parse Date
      let highlightedAt: Date | undefined;
      if (dateStr) {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          highlightedAt = parsedDate;
        }
      }

      book.highlights.push({
        content: highlightContent,
        note: note || undefined,
        page,
        highlightedAt,
      });
    }

    return Array.from(booksMap.values());
  }

  private getVal(row: string[], idx: number | undefined): string {
    return idx !== undefined && row[idx] ? row[idx].trim() : "";
  }

  /**
   * Robust CSV parser handling quoted fields and newlines within quotes.
   */
  private parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;
    
    // Normalize newlines
    const input = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const nextChar = input[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          currentCell += '"';
          i++; // Skip next quote
        } else {
          // Toggle quotes
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // End of cell
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\n' && !insideQuotes) {
        // End of row
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    // Handle last row if no newline at end
    if (currentRow.length > 0 || currentCell.length > 0) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    }
    
    return rows;
  }
}
