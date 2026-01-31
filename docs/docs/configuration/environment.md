---
sidebar_position: 2
---

# Environment Variables

Complete reference for all Lektr environment variables.

## Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | - | Full PostgreSQL connection string |
| `POSTGRES_USER` | Yes* | - | Database username |
| `POSTGRES_PASSWORD` | Yes* | - | Database password |
| `POSTGRES_DB` | Yes* | - | Database name |
| `POSTGRES_HOST` | Yes* | `localhost` | Database hostname |
| `POSTGRES_PORT` | Yes* | `5432` | Database port |

*Either `DATABASE_URL` or the individual `POSTGRES_*` variables are required.

## Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Prod only | Auto-generated | Secret key for JWT tokens |
| `ADMIN_EMAIL` | No | `admin@lektr.local` | Initial admin email |
| `ADMIN_PASSWORD` | No | `admin123` | Initial admin password |

:::caution
Always set `JWT_SECRET` in production! Using auto-generated secrets will invalidate sessions on restart.
:::

## Email (SMTP)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | No | - | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP server port |
| `SMTP_USER` | No | - | SMTP authentication username |
| `SMTP_PASS` | No | - | SMTP authentication password |
| `SMTP_SECURE` | No | `false` | Use SSL/TLS (for port 465) |
| `MAIL_FROM_NAME` | No | `Lektr` | Sender display name |
| `MAIL_FROM_EMAIL` | No | - | Sender email address |

## Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_URL` | No | `http://localhost:3002` | Base URL for email links |
| `CORS_ORIGINS` | No | `*` | Allowed CORS origins (comma-separated) |
| `NODE_ENV` | No | `development` | Environment mode |

## Features

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HARDCOVER_API_KEY` | No | - | API key for book metadata enrichment |
| `DIGEST_CRON` | No | `0 8 * * *` | Cron schedule for daily digest |

## Docker

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LEKTR_PORT` | No | `80` | Host port for Nginx proxy |

## Example `.env` File

```bash
# Database
POSTGRES_USER=lektr
POSTGRES_PASSWORD=secure-password-here
POSTGRES_DB=lektr
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Security
JWT_SECRET=your-very-long-secret-key-at-least-32-chars

# Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me-immediately

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM_NAME=Lektr
MAIL_FROM_EMAIL=noreply@example.com

# Application
APP_URL=https://lektr.example.com
HARDCOVER_API_KEY=your-hardcover-key

# Docker
LEKTR_PORT=80
```
