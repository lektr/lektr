/**
 * Metadata Provider Interface
 */

import { downloadCover } from "./covers";

export interface BookMetadata {
  coverImageUrl?: string;
  description?: string;
  pageCount?: number;
  publishedDate?: string;
  genres?: string[];
  isbn?: string;
}

export interface MetadataProvider {
  readonly name: string;
  isAvailable(): boolean;
  searchBook(title: string, author?: string): Promise<BookMetadata | null>;
}

export class MetadataService {
  private providers: MetadataProvider[] = [];

  registerProvider(provider: MetadataProvider) {
    if (provider.isAvailable()) {
      this.providers.push(provider);
      console.log(`📚 Metadata provider registered: ${provider.name}`);
    } else {
      console.log(`📚 Metadata provider skipped (not configured): ${provider.name}`);
    }
  }

  async enrichBook(title: string, author?: string, bookId?: string): Promise<BookMetadata | null> {
    for (const provider of this.providers) {
      try {
        const metadata = await provider.searchBook(title, author);
        if (metadata) {
          console.log(`📚 Found metadata for "${title}" via ${provider.name}`);
          
          if (metadata.coverImageUrl && bookId) {
            const localCoverUrl = await downloadCover(metadata.coverImageUrl, bookId);
            if (localCoverUrl) {
              metadata.coverImageUrl = localCoverUrl;
              console.log(`📸 Cover downloaded for "${title}"`);
            }
          }
          
          return metadata;
        }
      } catch (error) {
        console.error(`📚 ${provider.name} error:`, error);
      }
    }
    return null;
  }

  hasProviders(): boolean {
    return this.providers.length > 0;
  }
}

export const metadataService = new MetadataService();
