// Load environment variables from root .env (for bare-metal dev)
import "./env";

import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Legacy routes (not migrated to OpenAPI)
import { covers } from "./routes/covers";
import { settingsRouter } from "./routes/settings";
import { adminRouter } from "./routes/admin";

// OpenAPI routes
import { authOpenAPI } from "./openapi/auth.handlers";
import { booksOpenAPI } from "./openapi/books.handlers";
import { tagsOpenAPI } from "./openapi/tags.handlers";
import { reviewOpenAPI } from "./openapi/review.handlers";
import { searchOpenAPI } from "./openapi/search.handlers";
import { importOpenAPI } from "./openapi/import.handlers";
import { trashOpenAPI } from "./openapi/trash.handlers";

import { runMigrations } from "./db";
import { seedDatabase } from "./db/seed";
import { metadataService, HardcoverProvider, OpenLibraryProvider } from "./services";
import { exportService } from "./services/export";
import { MarkdownExporter, ObsidianExporter, ReadwiseExporter, NotionExporter } from "./services/export/providers";
import { exportRoutes } from "./routes/export";

// Email and job services
import { jobQueueService } from "./services/job-queue";
import { digestService } from "./services/digest";

// Register metadata providers (order matters - first match wins)
metadataService.registerProvider(new HardcoverProvider());
metadataService.registerProvider(new OpenLibraryProvider()); // Fallback for fuzzy search

// Register export providers
exportService.registerProvider(new MarkdownExporter());
exportService.registerProvider(new ObsidianExporter());
exportService.registerProvider(new ReadwiseExporter());
exportService.registerProvider(new NotionExporter());

// Security: Validate JWT_SECRET in production
const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET environment variable is required in production");
  process.exit(1);
}

// CORS origins from environment (comma-separated) or defaults
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"];

// Create OpenAPI-enabled Hono app
const app = new OpenAPIHono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    // Allow specified origins OR any request without an Origin header (native clients like KOReader)
    origin: (origin) => {
      if (!origin) return "*"; // No Origin header = native client, allow
      if (corsOrigins.includes(origin)) return origin;
      return null; // Reject unknown browser origins
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

// Mount OpenAPI routes
app.route("/api/v1/auth", authOpenAPI);
app.route("/api/v1/books", booksOpenAPI);
app.route("/api/v1/tags", tagsOpenAPI);
app.route("/api/v1/review", reviewOpenAPI);
app.route("/api/v1/search", searchOpenAPI);
app.route("/api/v1/import", importOpenAPI);
app.route("/api/v1/trash", trashOpenAPI);

// Legacy routes (covers, settings, and admin)
app.route("/api/v1/covers", covers);
app.route("/api/v1/settings", settingsRouter);
app.route("/api/v1/admin", adminRouter);
app.route("/api/v1/export", exportRoutes);

// OpenAPI spec endpoint
app.doc("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Lektr API",
    version: "0.0.1",
    description: "API for managing book highlights and spaced repetition review",
  },
  servers: [
    { url: "http://localhost:3001", description: "Development" },
  ],
});

// Swagger UI
app.get("/docs", swaggerUI({ url: "/openapi.json" }));

// Root health check
app.get("/", (c) => {
  return c.json({
    name: "Lektr API",
    version: "0.0.1",
    status: "running",
    docs: "/docs",
  });
});

// Version endpoint for UI
app.get("/api/v1/version", (c) => {
  return c.json({
    name: "Lektr API",
    version: "0.0.1",
  });
});

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
