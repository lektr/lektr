// Load environment variables from root .env (for bare-metal dev)
import "./env";

import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// OpenAPI routes
import { authOpenAPI } from "./openapi/auth.handlers";
import { booksOpenAPI } from "./openapi/books.handlers";
import { tagsOpenAPI } from "./openapi/tags.handlers";
import { reviewOpenAPI } from "./openapi/review.handlers";
import { searchOpenAPI } from "./openapi/search.handlers";
import { importOpenAPI } from "./openapi/import.handlers";
import { trashOpenAPI } from "./openapi/trash.handlers";
import { decksOpenAPI } from "./openapi/decks.handlers";
import { coversOpenAPI } from "./openapi/covers.handlers";
import { settingsOpenAPI } from "./openapi/settings.handlers";
import { exportOpenAPI } from "./openapi/export.handlers";
import { adminOpenAPI } from "./openapi/admin.handlers";
import { syncOpenAPI } from "./openapi/sync.handlers";
import { digestOpenAPI } from "./openapi/digest.handlers";
import { rediscoveryOpenAPI } from "./openapi/rediscovery.handlers";
import { capabilitiesOpenAPI } from "./openapi/capabilities.handlers";

import { metadataService, HardcoverProvider, OpenLibraryProvider } from "./services";
import { exportService } from "./services/export";
import { MarkdownExporter, ObsidianExporter, ReadwiseExporter, NotionExporter } from "./services/export/providers";

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

// Global error handler — ensures every error produces a response
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: err.message || 'Internal server error' }, 500);
});

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
app.route("/api/v1/decks", decksOpenAPI);
app.route("/api/v1/covers", coversOpenAPI);
app.route("/api/v1/settings", settingsOpenAPI);
app.route("/api/v1/export", exportOpenAPI);
app.route("/api/v1/admin", adminOpenAPI);
app.route("/api/v1/sync", syncOpenAPI);
app.route("/api/v1/digest", digestOpenAPI);
app.route("/api/v1/rediscovery", rediscoveryOpenAPI);
app.route("/api/v1/capabilities", capabilitiesOpenAPI);

// OpenAPI spec endpoint
app.doc("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Lektr API",
    version: "0.2.5",
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
    version: "0.2.5",
    status: "running",
    docs: "/docs",
  });
});

// Version endpoint for UI
app.get("/api/v1/version", (c) => {
  return c.json({
    name: "Lektr API",
    version: "0.2.5",
  });
});

export { app };
