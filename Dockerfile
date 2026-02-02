# syntax=docker/dockerfile:1.4
# =============================================================================
# Combined Container Dockerfile
# Runs: Nginx (port 80) + API (3001) + UI (3002) via Supervisor
# =============================================================================

FROM oven/bun:latest AS base
WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 1: Build & Install (Unified)
# -----------------------------------------------------------------------------
FROM base AS builder

# Copy root workspace config
COPY package.json bun.lock ./

# Copy package configs to correct locations
COPY lektr-shared/package.json lektr-shared/tsconfig.json ./lektr-shared/
COPY lektr-api/package.json ./lektr-api/
COPY lektr-ui/package.json ./lektr-ui/

# Install ALL dependencies at root (respecting workspaces)
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install

# Verify Next.js installation
RUN ls -la node_modules/.bin/next

# Build shared types
COPY lektr-shared/src ./lektr-shared/src
WORKDIR /app/lektr-shared
RUN bun run build

# -----------------------------------------------------------------------------
# Stage 2: Final image with all services
# -----------------------------------------------------------------------------
FROM base AS final

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/log/supervisor /var/log/nginx

# Configure Nginx
RUN rm -f /etc/nginx/sites-enabled/default
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Configure Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy installed node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/bun.lock ./

# Copy built shared library
COPY --from=builder /app/lektr-shared ./lektr-shared

# Copy source code for services
COPY lektr-api ./lektr-api
COPY lektr-ui ./lektr-ui

# Setup Environment Files (Symlink API/UI to root .env)
# Note: .env is mounted or copied at runtime usually, but we ensure symlinks exist
# Copy example env to .env so the symlinks work during build
# This prevents leaking actual secrets into the image
COPY .env.example ./.env
RUN ln -sf /app/.env /app/lektr-api/.env && \
    ln -sf /app/.env /app/lektr-ui/.env

# Build Next.js for production
WORKDIR /app/lektr-ui
# We use the root next binary
RUN /app/node_modules/.bin/next build

WORKDIR /app

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
