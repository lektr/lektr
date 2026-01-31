/**
 * Background Metadata Queue
 * 
 * Queues books for metadata enrichment and processes them in the background
 * without blocking the import request. Uses rate limiting to avoid API throttling.
 */

import { db } from "../db";
import { books } from "../db/schema";
import { eq } from "drizzle-orm";
import { metadataService } from "./metadata";

interface MetadataJob {
  bookId: string;
  title: string;
  author?: string;
}

class MetadataQueue {
  private queue: MetadataJob[] = [];
  private processing = false;
  private readonly delayMs = 1000; // 1 second between API calls

  /**
   * Add a book to the metadata enrichment queue.
   * Only queues if the book doesn't already have a cover.
   */
  async add(job: MetadataJob): Promise<void> {
    // Check if book already has cover (skip if it does)
    const [book] = await db
      .select({ coverImageUrl: books.coverImageUrl })
      .from(books)
      .where(eq(books.id, job.bookId))
      .limit(1);

    if (book?.coverImageUrl) {
      console.log(`📚 [Queue] Skipping "${job.title}" - already has cover`);
      return;
    }

    this.queue.push(job);
    console.log(`📚 [Queue] Added "${job.title}" (${this.queue.length} pending)`);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process the queue sequentially with rate limiting.
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    console.log(`📚 [Queue] Starting background processing...`);

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      
      try {
        console.log(`📚 [Queue] Processing "${job.title}"...`);
        
        // Fetch metadata and download cover
        const metadata = await metadataService.enrichBook(
          job.title,
          job.author,
          job.bookId
        );

        if (metadata) {
          // Update book with enriched metadata
          const currentBook = await db
            .select({ metadata: books.metadata })
            .from(books)
            .where(eq(books.id, job.bookId))
            .limit(1);

          await db
            .update(books)
            .set({
              coverImageUrl: metadata.coverImageUrl,
              metadata: {
                ...(currentBook[0]?.metadata as Record<string, unknown> || {}),
                description: metadata.description,
                pageCount: metadata.pageCount,
                publishedDate: metadata.publishedDate,
                genres: metadata.genres,
              },
              updatedAt: new Date(),
            })
            .where(eq(books.id, job.bookId));

          console.log(`📚 [Queue] ✓ Enriched "${job.title}"`);
        } else {
          console.log(`📚 [Queue] ✗ No metadata found for "${job.title}"`);
        }
      } catch (error) {
        console.error(`📚 [Queue] Error processing "${job.title}":`, error);
      }

      // Rate limit: wait before next request
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
      }
    }

    this.processing = false;
    console.log(`📚 [Queue] Background processing complete.`);
  }

  /**
   * Get current queue status.
   */
  getStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.queue.length,
      processing: this.processing,
    };
  }
}

// Singleton instance
export const metadataQueue = new MetadataQueue();
