import type { MetadataProvider, BookMetadata } from "./metadata";
import { normalizeTitle, normalizeAuthor } from "./normalize";

const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_COVERS_URL = "https://covers.openlibrary.org/b";

/**
 * OpenLibraryProvider - Fetches book metadata from Open Library
 * 
 * Open Library is free, no API key required, and supports fuzzy search.
 * Used as a fallback when Hardcover doesn't find a match.
 */
export class OpenLibraryProvider implements MetadataProvider {
  readonly name = "OpenLibrary";

  isAvailable(): boolean {
    // Always available - no API key needed
    return true;
  }

  async searchBook(title: string, author?: string): Promise<BookMetadata | null> {
    try {
      // Normalize title for better matching
      const normalizedTitle = normalizeTitle(title);
      const normalizedAuthor = author ? normalizeAuthor(author) : undefined;
      
      // Build search query
      let searchQuery = `title=${encodeURIComponent(normalizedTitle)}`;
      if (normalizedAuthor) {
        searchQuery += `&author=${encodeURIComponent(normalizedAuthor)}`;
      }
      searchQuery += "&limit=5";
      
      console.log(`📚 OpenLibrary: Searching for "${normalizedTitle}"...`);
      
      const response = await fetch(`${OPEN_LIBRARY_SEARCH_URL}?${searchQuery}`);
      
      if (!response.ok) {
        console.error(`OpenLibrary API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (!data.docs || data.docs.length === 0) {
        console.log(`📚 OpenLibrary: No results for "${normalizedTitle}"`);
        return null;
      }

      // Find best match - prefer ones with covers and matching author
      const normalizedTitleLower = normalizedTitle.toLowerCase();
      let bestMatch = data.docs[0];
      
      for (const doc of data.docs) {
        const docTitle = (doc.title || "").toLowerCase();
        const hasExactTitle = docTitle === normalizedTitleLower || 
                              docTitle.startsWith(normalizedTitleLower);
        const hasCover = doc.cover_i || doc.cover_edition_key;
        
        // Check author match
        let hasAuthorMatch = !normalizedAuthor;
        if (normalizedAuthor && doc.author_name) {
          const authorLower = normalizedAuthor.toLowerCase();
          hasAuthorMatch = doc.author_name.some((a: string) => 
            a.toLowerCase().includes(authorLower) || 
            authorLower.includes(a.toLowerCase())
          );
        }
        
        if (hasExactTitle && hasCover && hasAuthorMatch) {
          bestMatch = doc;
          break;
        }
        
        // Prefer matches with covers
        if (hasCover && !bestMatch.cover_i && !bestMatch.cover_edition_key) {
          bestMatch = doc;
        }
      }

      // Build cover URL
      let coverImageUrl: string | undefined;
      if (bestMatch.cover_i) {
        // Use the cover ID for the best quality
        coverImageUrl = `${OPEN_LIBRARY_COVERS_URL}/id/${bestMatch.cover_i}-L.jpg`;
      } else if (bestMatch.cover_edition_key) {
        coverImageUrl = `${OPEN_LIBRARY_COVERS_URL}/olid/${bestMatch.cover_edition_key}-L.jpg`;
      }

      console.log(`📚 OpenLibrary: Found "${bestMatch.title}", cover: ${coverImageUrl ? 'yes' : 'no'}`);

      return {
        coverImageUrl,
        description: undefined, // Open Library search doesn't return descriptions
        pageCount: bestMatch.number_of_pages_median,
        publishedDate: bestMatch.first_publish_year?.toString(),
        genres: bestMatch.subject?.slice(0, 5),
      };
    } catch (error) {
      console.error("OpenLibrary API request failed:", error);
      return null;
    }
  }
}
