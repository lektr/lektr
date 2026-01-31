import type { MetadataProvider, BookMetadata } from "./metadata";
import { getTitleVariations, normalizeAuthor } from "./normalize";

const HARDCOVER_API_URL = "https://api.hardcover.app/v1/graphql";

/**
 * HardcoverProvider - Fetches book metadata from Hardcover.app
 * 
 * Uses their GraphQL API to search for books and get covers.
 * Requires HARDCOVER_API_KEY environment variable.
 */
export class HardcoverProvider implements MetadataProvider {
  readonly name = "Hardcover";
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.HARDCOVER_API_KEY;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async searchBook(title: string, author?: string): Promise<BookMetadata | null> {
    if (!this.apiKey) return null;

    // Try multiple title variations for better matching
    const titleVariations = getTitleVariations(title);
    const normalizedAuthor = author ? normalizeAuthor(author) : undefined;
    
    for (const searchTitle of titleVariations) {
      const result = await this.searchWithTitle(searchTitle, normalizedAuthor);
      if (result) {
        return result;
      }
    }
    
    return null;
  }

  private async searchWithTitle(title: string, author?: string): Promise<BookMetadata | null> {
    // Use exact match query (ilike not allowed on Hardcover API)
    const query = `
      query SearchBooks($title: String!) {
        books(
          where: { title: { _eq: $title } }
          limit: 5
          order_by: { users_count: desc_nulls_last }
        ) {
          id
          title
          image {
            url
          }
          description
          pages
          release_date
          contributions(limit: 3) {
            author {
              name
            }
          }
        }
      }
    `;

    try {
      console.log(`📚 Hardcover: Searching for "${title}"...`);
      
      const response = await fetch(HARDCOVER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query,
          variables: { title: title },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Hardcover API error: ${response.status} - ${errorText}`);
        return null;
      }

      const data = await response.json();
      console.log(`📚 Hardcover response:`, JSON.stringify(data).slice(0, 300));
      
      // books query returns array
      const books = data?.data?.books;

      if (!books || books.length === 0) {
        console.log(`📚 No books found for "${title}"`);
        return null;
      }

      // Find best match - prefer exact title match
      const normalizedTitle = title.toLowerCase().trim();
      const exactMatch = books.find(
        (b: { title: string }) => b.title.toLowerCase().trim() === normalizedTitle
      );
      const book = exactMatch || books[0];

      // Extract author names
      const authors = book.contributions
        ?.map((c: { author: { name: string } }) => c.author?.name)
        .filter(Boolean);

      // If author was provided, verify it matches
      if (author && authors?.length > 0) {
        const authorLower = author.toLowerCase();
        const hasMatchingAuthor = authors.some(
          (a: string) => a.toLowerCase().includes(authorLower) || authorLower.includes(a.toLowerCase())
        );
        if (!hasMatchingAuthor && !exactMatch) {
          // Author doesn't match and title isn't exact - skip this result
          console.log(`📚 Author mismatch for "${title}"`);
          return null;
        }
      }

      console.log(`📚 Found book: ${book.title}, cover: ${book.image?.url ? 'yes' : 'no'}`);

      return {
        coverImageUrl: book.image?.url,
        description: book.description,
        pageCount: book.pages,
        publishedDate: book.release_date,
        genres: undefined,
      };
    } catch (error) {
      console.error("Hardcover API request failed:", error);
      return null;
    }
  }
}
