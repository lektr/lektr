# syntax=docker/dockerfile:1.4
# =============================================================================
# Combined Container Dockerfile
# Runs: Nginx (port 80) + API (3001) + UI (3002) via Supervisor
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build (runs on native platform only, not emulated)
# This avoids QEMU issues with native modules like lightningcss
# -----------------------------------------------------------------------------
FROM --platform=$BUILDPLATFORM node:25-slim AS builder

WORKDIR /app

# Copy root workspace config
COPY package.json package-lock.json ./

# Copy package configs to correct locations
COPY lektr-shared/package.json lektr-shared/tsconfig.json ./lektr-shared/
COPY lektr-api/package.json ./lektr-api/
COPY lektr-ui/package.json ./lektr-ui/

# Install ALL dependencies at root (respecting workspaces)
RUN npm ci

# Verify Next.js installation
RUN ls -la node_modules/.bin/next

# Build shared types
COPY lektr-shared/src ./lektr-shared/src
WORKDIR /app/lektr-shared
RUN npm run build

# Copy UI source and build Next.js
WORKDIR /app
COPY lektr-ui ./lektr-ui
COPY .env.example ./.env
RUN ln -sf /app/.env /app/lektr-ui/.env

WORKDIR /app/lektr-ui
RUN /app/node_modules/.bin/next build

# -----------------------------------------------------------------------------
# Stage 2: Final image with all services (multi-arch)
# -----------------------------------------------------------------------------
FROM node:25-slim AS final

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/log/supervisor /var/log/nginx

# Configure Nginx
RUN rm -f /etc/nginx/sites-enabled/default
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Configure Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy package files for runtime deps
COPY --from=builder /app/package.json /app/package-lock.json ./

# Copy built shared library
COPY --from=builder /app/lektr-shared ./lektr-shared

# Copy API source
COPY lektr-api ./lektr-api

# Copy built UI (with .next directory from builder)
COPY --from=builder /app/lektr-ui ./lektr-ui

# Setup Environment Files (Symlink API/UI to root .env)
COPY .env.example ./.env
RUN ln -sf /app/.env /app/lektr-api/.env && \
    ln -sf /app/.env /app/lektr-ui/.env

# Install production dependencies only for target architecture
# --omit=dev skips build-time deps like lightningcss
RUN npm ci --omit=dev

# Reinstall sharp with platform-specific binaries for target arch
RUN npm install --include=optional sharp

# Reinstall onnxruntime-node with platform-specific binaries for embedding generation
# This is required for arm64 since the default install doesn't include arm64 binaries
RUN npm install --include=optional onnxruntime-node

# Create HuggingFace cache directory for embedding models
RUN mkdir -p /app/.cache/huggingface
ENV HF_HOME=/app/.cache/huggingface

# Pre-download the embedding model during build so it's available immediately at runtime
# This runs a simple Node script that loads the model, triggering the download
RUN cd /app/lektr-api && node -e "\
    const { pipeline, env } = require('@huggingface/transformers'); \
    env.cacheDir = '/app/.cache/huggingface'; \
    env.allowRemoteModels = true; \
    (async () => { \
    console.log('Pre-downloading embedding model...'); \
    await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'); \
    console.log('Model downloaded successfully!'); \
    })();"

# Expose Nginx port
EXPOSE 80

# Default environment
ENV NEXT_PUBLIC_API_URL=""
# Reduce memory usage
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/api/v1/version || exit 1

# Start supervisor (manages nginx, api, ui)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
