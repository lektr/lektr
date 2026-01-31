import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

// Load env from monorepo root for bare-metal dev
// In Docker, env vars are injected via docker-compose env_file
const rootEnvPath = resolve(process.cwd(), "../.env");
if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix workspace root detection in Docker
  // Dependencies are installed at /app (workspace root)
  turbopack: {
    root: "/app",
  },
};

export default nextConfig;
