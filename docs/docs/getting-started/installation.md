---
sidebar_position: 1
---

# Installation

This guide covers deploying Lektr using Docker, the recommended method for self-hosting.

## Prerequisites

- **Docker** and **Docker Compose** v2+
- At least 2GB RAM recommended
- PostgreSQL with pgvector extension (included in Docker setup)

## Quick Start with Docker

1. **Clone the repository**

```bash
git clone https://github.com/sergmetelin/lektr.git
cd lektr
```

2. **Create environment file**

```bash
cp .env.example .env
```

3. **Configure environment variables**

Edit `.env` with your settings:

```bash
# Required
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-key

# Optional but recommended
HARDCOVER_API_KEY=your-hardcover-api-key  # For book metadata
```

4. **Start the services**

```bash
docker compose up -d
```

5. **Access Lektr**

- **Web UI**: http://localhost (or your configured port)
- **Default admin**: `admin@lektr.local` / `admin123`

:::caution
Change the default admin password immediately after first login!
:::

## Docker Compose Services

The stack includes:

| Service     | Port | Description              |
| ----------- | ---- | ------------------------ |
| `lektr-ui`  | 3002 | Next.js frontend         |
| `lektr-api` | 3001 | Hono API backend         |
| `postgres`  | 5432 | PostgreSQL with pgvector |
| `nginx`     | 80   | Reverse proxy            |

## Updating

To update to the latest version:

```bash
git pull
docker compose build
docker compose up -d
```

## Reverse Proxy Setup

If you're running Lektr behind your own reverse proxy (Nginx, Traefik, Caddy), configure it to proxy to the Lektr container on port 80.

### Nginx Example

```nginx
server {
    listen 80;
    server_name lektr.example.com;

    location / {
        proxy_pass http://localhost:80;  # Or your LEKTR_PORT
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Traefik Labels (Docker Compose)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.lektr.rule=Host(`lektr.example.com`)"
  - "traefik.http.services.lektr.loadbalancer.server.port=80"
```

:::tip
Set `APP_URL` in your `.env` to your public URL for correct email links.
:::

## Troubleshooting

### Database connection issues

Ensure PostgreSQL is running and `DATABASE_URL` is correct:

```bash
docker compose logs postgres
```

### API not responding

Check API logs:

```bash
docker compose logs lektr-api
```

## Next Steps

- [Configure email settings](/admin/email-setup)
- [Import your first highlights](/features/import)
- [Set up spaced repetition review](/features/review)
