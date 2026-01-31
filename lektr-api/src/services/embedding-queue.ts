/**
 * Background Embedding Queue
 */

import { db } from "../db";
import { highlights } from "../db/schema";
import { eq, isNull } from "drizzle-orm";
import { embeddingService } from "./embeddings";

interface EmbeddingJob {
  highlightId: string;
  content: string;
}

class EmbeddingQueue {
  private queue: EmbeddingJob[] = [];
  private processing = false;
  private readonly delayMs = 100;

  add(job: EmbeddingJob): void {
    this.queue.push(job);
    if (!this.processing) {
      this.processQueue();
    }
  }

  addBatch(jobs: EmbeddingJob[]): void {
    this.queue.push(...jobs);
    console.log(`🧠 [Queue] Added ${jobs.length} highlights for embedding (${this.queue.length} total pending)`);
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    console.log(`🧠 [Queue] Starting embedding generation...`);

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      
      try {
        const embedding = await embeddingService.generateEmbedding(job.content);
        if (embedding) {
          await db
            .update(highlights)
            .set({ embedding })
            .where(eq(highlights.id, job.highlightId));
        }
      } catch (error) {
        console.error(`🧠 [Queue] Error embedding highlight ${job.highlightId}:`, error);
      }

      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
      }
    }

    this.processing = false;
    console.log(`🧠 [Queue] Embedding generation complete.`);
  }

  async queueMissing(): Promise<number> {
    const missing = await db
      .select({ id: highlights.id, content: highlights.content })
      .from(highlights)
      .where(isNull(highlights.embedding))
      .limit(1000);

    if (missing.length > 0) {
      this.addBatch(missing.map(h => ({ highlightId: h.id, content: h.content })));
    }

    return missing.length;
  }

  getStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.queue.length,
      processing: this.processing,
    };
  }
}

export const embeddingQueue = new EmbeddingQueue();
