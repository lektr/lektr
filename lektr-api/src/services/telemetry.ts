
import { PostHog } from 'posthog-node';
import { getSetting } from '../routes/settings';
import { db } from '../db';
import { books, highlights, tags } from '../db/schema';
import { sql } from 'drizzle-orm';

// Initialize PostHog client
// We use a public API key for the open source project, but users can override it
const DEFAULT_POSTHOG_KEY = "phc_jiZH90pf8c5vN4DnvPCTcaesPoFfbW2OLiusYyzu9cy"; // Replace with actual key or env var if needed
const POSTHOG_HOST = "https://app.posthog.com";

let client: PostHog | null = null;

export const telemetryService = {
  async init() {
    if (client) return;

    try {
      // Check if telemetry is enabled in DB
      const enabled = await getSetting("telemetry_enabled");
      
      // Default to "true" if not set, consistent with our goal
      if (enabled === "false") {
        return;
      }

      const apiKey = process.env.POSTHOG_API_KEY || DEFAULT_POSTHOG_KEY;
      
      if (apiKey && apiKey !== "disabled") {
        client = new PostHog(apiKey, {
          host: process.env.POSTHOG_HOST || POSTHOG_HOST,
        });
        
        // Handle errors to prevent crashing
        client.on('error', (err) => {
          console.error('PostHog error:', err);
        });
      }
    } catch (err) {
      console.warn("Failed to initialize telemetry:", err);
    }
  },

  async track(event: string, properties: Record<string, any> = {}) {
    try {
      // Re-check setting in case it changed at runtime (cached by getSetting usually, but good practice)
      const enabled = await getSetting("telemetry_enabled");
      if (enabled === "false") return;

      if (!client) await this.init();
      if (!client) return;

      // We need a distinctId. For backend events where we often have a userId, we expect it in properties.
      // If not provided, we might generate a fallback or skip.
      const distinctId = properties.userId || properties.distinct_id || 'system';

      client.capture({
        distinctId,
        event,
        properties: {
          ...properties,
          $current_url: 'backend',
        }
      });
    } catch (err) {
      // Silently fail to not disrupt app logic
    }
  },

  async identify(userId: string, properties: Record<string, any> = {}) {
    try {
      const enabled = await getSetting("telemetry_enabled");
      if (enabled === "false") return;

      if (!client) await this.init();
      if (!client) return;

      client.identify({
        distinctId: userId,
        properties
      });
    } catch (err) {
      // Silently fail
    }
  },

  async getTelemetryStats() {
    try {
      const [bookCount] = await db.select({ count: sql<number>`count(*)` }).from(books);
      const [highlightCount] = await db.select({ count: sql<number>`count(*)` }).from(highlights);
      const [tagCount] = await db.select({ count: sql<number>`count(*)` }).from(tags);
      
      return {
        totalBooks: Number(bookCount?.count || 0),
        totalHighlights: Number(highlightCount?.count || 0),
        totalTags: Number(tagCount?.count || 0),
      };
    } catch (err) {
      console.warn("Failed to get telemetry stats:", err);
      return {};
    }
  },
  
  async shutdown() {
    if (client) {
      await client.shutdown();
    }
  }
};
