import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type Postgres from "postgres";
import * as schema from "./schema";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres: typeof Postgres = require("postgres");

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || (
  process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD && process.env.POSTGRES_DB
    ? `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB}`
    : undefined
);

if (!connectionString) {
  throw new Error("DATABASE_URL or POSTGRES_* environment variables are not set");
}

// Migration client (closes after migration)
const migrationClient = postgres(connectionString, { max: 1 });

// Regular connection pool for queries
const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema });

/**
 * Run database migrations on startup.
 * This ensures the database schema is always up-to-date.
 */
export async function runMigrations() {
  console.log("🔄 Running database migrations...");

  try {
    // Ensure pgvector extension exists BEFORE running migrations
    // This is required because our schema uses vector(384) for embeddings
    await migrationClient`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log("✅ pgvector extension ready");

    const migrationDb = drizzle(migrationClient);
    await migrate(migrationDb, { migrationsFolder: "./drizzle" });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await migrationClient.end();
  }
}

