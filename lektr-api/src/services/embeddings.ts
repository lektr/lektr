/**
 * Embedding Service
 *
 * Generates 384-dimensional embeddings using the all-MiniLM-L6-v2 model
 * via @huggingface/transformers. The model runs locally without API calls.
 */

import { pipeline, env, type FeatureExtractionPipeline } from "@huggingface/transformers";

// Configure transformers for Node.js environment
env.useBrowserCache = false;
env.allowRemoteModels = true;
env.allowLocalModels = true;

// Set cache directory via environment variable
if (process.env.HF_HOME) {
  env.cacheDir = process.env.HF_HOME;
}

class EmbeddingService {
  private pipelineInstance: FeatureExtractionPipeline | null = null;
  private loadingPromise: Promise<FeatureExtractionPipeline> | null = null;
  private readonly modelName = "Xenova/all-MiniLM-L6-v2";

  /**
   * Get or initialize the embedding pipeline.
   */
  private async getPipeline(): Promise<FeatureExtractionPipeline> {
    if (this.pipelineInstance) {
      return this.pipelineInstance;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    console.log(`🧠 Loading embedding model: ${this.modelName}...`);
    console.log(`🧠 Cache directory: ${env.cacheDir || 'default'}`);
    console.log(`🧠 Platform: ${process.platform} / ${process.arch}`);

    // Check if cache directory exists and is writable
    const fs = await import('fs');
    const cacheDir = env.cacheDir || '/tmp/hf-cache';
    try {
      if (!fs.existsSync(cacheDir)) {
        console.log(`🧠 Creating cache directory: ${cacheDir}`);
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.accessSync(cacheDir, fs.constants.W_OK);
      console.log(`🧠 Cache directory is writable`);
    } catch (err) {
      console.error(`🧠 Cache directory issue:`, err);
    }

    // Minimal configuration - let the library handle defaults
    this.loadingPromise = (async () => {
      try {
        const pipe = await pipeline("feature-extraction", this.modelName, {
          progress_callback: (progress: any) => {
            if (progress.status === 'download') {
              console.log(`🧠 Downloading: ${progress.file} (${Math.round(progress.progress || 0)}%)`);
            } else if (progress.status === 'done') {
              console.log(`🧠 Download complete: ${progress.file}`);
            } else if (progress.status === 'ready') {
              console.log(`🧠 Model ready`);
            }
          }
        });
        console.log(`🧠 Embedding model loaded successfully`);
        return pipe as FeatureExtractionPipeline;
      } catch (error) {
        console.error(`🧠 Failed to load embedding model:`, error);
        throw error;
      }
    })();

    try {
      this.pipelineInstance = await this.loadingPromise;
      return this.pipelineInstance;
    } finally {
      this.loadingPromise = null;
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
    return this.pipelineInstance !== null;
  }
}

export const embeddingService = new EmbeddingService();

