import type { ExportProvider, ExportProviderInfo, ExportOptions, ExportResult, BookWithHighlights } from "./types";
import { db } from "../../db";
import { books, highlights as highlightsTable } from "../../db/schema";
import { eq, inArray, and } from "drizzle-orm";

class ExportService {
  private providers: Map<string, ExportProvider> = new Map();

  registerProvider(provider: ExportProvider): void {
    this.providers.set(provider.id, provider);
    console.log(`[ExportService] Registered provider: ${provider.id}`);
  }

  getProviders(): ExportProviderInfo[] {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      icon: p.icon,
      requiresAuth: p.requiresAuth,
    }));
  }

  getProvider(id: string): ExportProvider | undefined {
    return this.providers.get(id);
  }

  async fetchBooksWithHighlights(
    userId: string,
    bookIds?: string[]
  ): Promise<BookWithHighlights[]> {
    // Fetch books
    let bookQuery = db.select().from(books).where(eq(books.userId, userId));
    
    let userBooks;
    if (bookIds && bookIds.length > 0) {
      userBooks = await db
        .select()
        .from(books)
        .where(and(eq(books.userId, userId), inArray(books.id, bookIds)));
    } else {
      userBooks = await db.select().from(books).where(eq(books.userId, userId));
    }

    // Fetch highlights for each book
    const result: BookWithHighlights[] = [];
    for (const book of userBooks) {
      const bookHighlights = await db
        .select()
        .from(highlightsTable)
        .where(eq(highlightsTable.bookId, book.id));

      result.push({
        id: book.id,
        title: book.title,
        author: book.author,
        coverImageUrl: book.coverImageUrl,
        highlights: bookHighlights,
      });
    }

    return result;
  }

  async export(providerId: string, options: ExportOptions): Promise<ExportResult> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Export provider not found: ${providerId}`);
    }

    const books = await this.fetchBooksWithHighlights(options.userId, options.bookIds);
    
    if (books.length === 0) {
      return {
        type: "json",
        message: "No books found to export",
      };
    }

    return provider.export(books, options);
  }
}

export const exportService = new ExportService();
export * from "./types";
