/**
 * Embedding Service
 * 
 * Generates 384-dimensional embeddings using the all-MiniLM-L6-v2 model
 * via @huggingface/transformers. The model runs locally without API calls.
 */

import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

class EmbeddingService {
  private pipeline: FeatureExtractionPipeline | null = null;
  private loading: Promise<FeatureExtractionPipeline> | null = null;
  private readonly modelName = "Xenova/all-MiniLM-L6-v2";

  /**
   * Get or initialize the embedding pipeline.
   */
  private async getPipeline(): Promise<FeatureExtractionPipeline> {
    if (this.pipeline) {
      return this.pipeline;
    }

    if (this.loading) {
      return this.loading;
    }

    console.log(`🧠 Loading embedding model: ${this.modelName}...`);
    
    this.loading = pipeline("feature-extraction", this.modelName, {
      dtype: "q8",
    }) as Promise<FeatureExtractionPipeline>;

    try {
      this.pipeline = await this.loading;
      console.log(`🧠 Embedding model loaded successfully`);
      return this.pipeline;
    } finally {
      this.loading = null;
    }
  }

  /**
   * Generate a 384-dimensional embedding for the given text.
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const pipe = await this.getPipeline();
      const truncatedText = text.slice(0, 1000);
      
      const output = await pipe(truncatedText, {
        pooling: "mean",
        normalize: true,
      });

      return Array.from(output.data as Float32Array);
    } catch (error) {
      console.error("Embedding generation failed:", error);
      return null;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch.
   */
  async generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    const results: (number[] | null)[] = [];
    for (const text of texts) {
      results.push(await this.generateEmbedding(text));
    }
    return results;
  }

  /**
   * Check if the model is loaded.
   */
  isLoaded(): boolean {
    return this.pipeline !== null;
  }
}

export const embeddingService = new EmbeddingService();
