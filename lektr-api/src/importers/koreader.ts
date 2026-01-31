import type { BaseImporter } from "./base";
import type { ParsedBook, ParsedHighlight, SourceType } from "../types";

interface KOReaderEntry {
  text: string;
  chapter?: string;
  page?: number;
  time?: number;
  sort?: "highlight" | "note" | "bookmark";
  notes?: string;
}

interface KOReaderMetadata {
  title?: string;
  author?: string;
  authors?: string;
  file?: string;
  doc_path?: string;
  md5sum?: string;
  entries?: KOReaderEntry[];
  highlight?: Record<string, LegacyHighlight[]>;
  bookmarks?: LegacyHighlight[];
}

interface LegacyHighlight {
  text?: string;
  notes?: string;
  chapter?: string;
  page?: number;
  datetime?: string;
  highlighted?: boolean;
}

export class KOReaderImporter implements BaseImporter {
  readonly sourceType: SourceType = "koreader";

  async validate(file: File): Promise<boolean> {
    const validExtensions = [".json", ".lua"];
    const hasValidExtension = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      return false;
    }

    try {
      const content = await file.text();
      const data = this.parseContent(content);
      return data !== null;
    } catch {
      return false;
    }
  }

  async parse(file: File): Promise<ParsedBook[]> {
    const content = await file.text();
    const data = this.parseContent(content);

    if (!data) {
      throw new Error("Failed to parse KOReader metadata file");
    }

    let booksData: KOReaderMetadata[];
    
    if (typeof data === 'object' && !Array.isArray(data) && 'documents' in data) {
      const wrapper = data as { documents: KOReaderMetadata[] };
      booksData = wrapper.documents;
    } else if (Array.isArray(data)) {
      booksData = data;
    } else {
      booksData = [data as KOReaderMetadata];
    }
    
    return booksData.map((bookData) => this.parseBook(bookData));
  }

  private parseContent(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch {
      try {
        return this.parseLuaTable(content);
      } catch {
        return null;
      }
    }
  }

  private parseLuaTable(lua: string): KOReaderMetadata {
    let cleaned = lua.replace(/--\[\[[\s\S]*?\]\]/g, "");
    cleaned = cleaned.replace(/--[^\n]*/g, "");

    cleaned = cleaned
      .replace(/\[["']([^"']+)["']\]\s*=/g, '"$1":')
      .replace(/\[(\d+)\]\s*=/g, '"$1":')
      .replace(/(\w+)\s*=/g, '"$1":')
      .replace(/\s*=\s*/g, ": ")
      .replace(/:\s*nil/g, ": null")
      .replace(/:\s*true/g, ": true")
      .replace(/:\s*false/g, ": false");

    return JSON.parse(cleaned);
  }

  private parseBook(data: KOReaderMetadata): ParsedBook {
    const highlights: ParsedHighlight[] = [];

    if (data.entries && Array.isArray(data.entries)) {
      for (const entry of data.entries) {
        if (entry.text && (entry.sort === "highlight" || !entry.sort)) {
          highlights.push({
            content: entry.text,
            note: entry.notes,
            chapter: entry.chapter,
            page: entry.page,
            highlightedAt: entry.time ? new Date(entry.time * 1000) : undefined,
          });
        }
      }
    }

    if (data.highlight) {
      for (const pageHighlights of Object.values(data.highlight)) {
        if (Array.isArray(pageHighlights)) {
          for (const h of pageHighlights) {
            if (h.text && h.highlighted !== false) {
              highlights.push({
                content: h.text,
                note: h.notes,
                chapter: h.chapter,
                page: h.page,
                highlightedAt: h.datetime ? new Date(h.datetime) : undefined,
              });
            }
          }
        }
      }
    }

    if (data.bookmarks) {
      for (const b of data.bookmarks) {
        if (b.text && b.highlighted !== false) {
          highlights.push({
            content: b.text,
            note: b.notes,
            chapter: b.chapter,
            page: b.page,
            highlightedAt: b.datetime ? new Date(b.datetime) : undefined,
          });
        }
      }
    }

    return {
      title: data.title || "Untitled",
      author: data.author || data.authors,
      externalId: data.md5sum || data.file || data.doc_path,
      highlights,
    };
  }
}
