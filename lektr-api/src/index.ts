import { app } from "./app";
import { runMigrations } from "./db";
import { seedDatabase } from "./db/seed";

// Email and job services
import { jobQueueService } from "./services/job-queue";
import { digestService } from "./services/digest";

// Start server with migrations and seeding
const port = Number(process.env.PORT ?? 3001);

async function start() {
  await runMigrations();
  await seedDatabase();

  // Start background services
  jobQueueService.start();
  digestService.start(process.env.DIGEST_CRON || "0 8 * * *"); // Default: 8 AM daily

  // Use @hono/node-server for Node.js runtime
  const { serve } = await import("@hono/node-server");
  serve({
    fetch: app.fetch,
    port,
  });

  console.log(`🚀 Lektr API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}

start();

// Keep export for Bun compatibility during local development
export default {
  port,
  fetch: app.fetch,
};
