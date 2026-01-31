/**
 * Environment Configuration
 *
 * Loads .env from monorepo root for bare-metal development.
 * In Docker, env vars are injected via docker-compose env_file.
 */
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

// Load from monorepo root (../.env relative to lektr-api/)
const rootEnvPath = resolve(__dirname, "../../.env");
if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
}
