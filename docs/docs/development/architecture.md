---
sidebar_position: 1
---

# Architecture

Overview of Lektr's technical architecture for developers.

## System Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────▶│    Nginx     │────▶│  lektr-ui    │
│              │     │   (proxy)    │     │  (Next.js)   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  lektr-api   │────▶│  PostgreSQL  │
                     │   (Hono)     │     │  (pgvector)  │
                     └──────────────┘     └──────────────┘
```

## Components

### lektr-api

**Runtime**: Bun  
**Framework**: Hono  
**Location**: `/lektr-api`

The API server handles:
- Authentication (JWT cookies)
- CRUD operations for books, highlights, tags
- Import parsing (Kindle, KOReader)
- Search (hybrid vector + full-text)
- Email sending and job queue
- Export generation

### lektr-ui

**Runtime**: Node.js  
**Framework**: Next.js 14 (App Router)  
**Location**: `/lektr-ui`

The web frontend provides:
- Responsive UI
- Library management
- Search interface
- Review mode (FSRS)
- Admin settings

### lektr-shared

**Location**: `/lektr-shared`

Shared TypeScript types used by both API and UI.

### Database

**Engine**: PostgreSQL 16  
**Extensions**: pgvector

Stores:
- Users and authentication
- Books and highlights
- Tags and relationships
- Vector embeddings
- Job queue
- Settings

## Key Technologies

| Area | Technology |
|------|------------|
| API Framework | Hono |
| ORM | Drizzle |
| Frontend | Next.js + React |
| Styling | CSS Modules |
| State | TanStack Query |
| Email | Nodemailer + React Email |
| Embeddings | pgvector |
| Spaced Rep | FSRS |

## Directory Structure

```
lektr/
├── lektr-api/
│   ├── src/
│   │   ├── db/           # Database schema & migrations
│   │   ├── emails/       # React Email templates
│   │   ├── openapi/      # API route handlers
│   │   ├── routes/       # Route definitions
│   │   └── services/     # Business logic
│   └── drizzle/          # Migration files
├── lektr-ui/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   └── lib/              # API client, utilities
├── lektr-shared/
│   └── src/              # Shared types
├── docs/                 # This documentation
└── docker-compose.yml
```

## Development Setup

See [Installation](/getting-started/installation) for Docker setup.

For local development without Docker:

```bash
# Start PostgreSQL
docker run -d --name lektr-db \
  -e POSTGRES_USER=lektr \
  -e POSTGRES_PASSWORD=lektr_dev \
  -e POSTGRES_DB=lektr \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# API
cd lektr-api
bun install
bun run dev

# UI (separate terminal)
cd lektr-ui
bun install
bun run dev
```
