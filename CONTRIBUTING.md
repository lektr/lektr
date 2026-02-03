# Contributing to Lektr

First off, thank you for considering contributing to Lektr! It's people like you that make the open-source community such an amazing place to learn, inspire, and create.

Lektr is a **local-first, self-hosted knowledge preservation engine**. We prioritize privacy, data longevity, and a calm, reading-focused user experience.

## ⚡ Quick Start

You can run the entire stack locally using Docker and npm.

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or later)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) or Docker Engine

### Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/lektr/lektr.git
   cd lektr
   ```

2. **Install Dependencies**
   We use npm for package management across the monorepo.

   ```bash
   npm install
   ```

3. **Configure Environment**
   Copy the example environment file.

   ```bash
   cp .env.example .env
   ```

   _Note: The defaults work out-of-the-box for local development._

4. **Start Development Server**
   This boots up the API (Hono), UI (Next.js), Postgres, and Nginx reverse proxy with hot-reloading enabled.

   ```bash
   docker compose -f docker-compose.dev.yml up
   ```

   - **UI**: [http://localhost](http://localhost) (via Nginx on port 80)
   - **API**: [http://localhost/api](http://localhost/api)
   - **Direct UI** (if needed): [http://localhost:3002](http://localhost:3002)
   - **Direct API** (if needed): [http://localhost:3001](http://localhost:3001)

---

## 🏗️ Project Structure

Lektr is structured as a monorepo:

- **`lektr-api/`**: Backend API built with **Hono.js**. Handles database logic, auth, and AI processing.
- **`lektr-ui/`**: Frontend built with **Next.js 16** (App Router).
- **`lektr-shared/`**: Shared TypeScript types and utilities. **All shared types must live here.**
- **`db/`**: Database migrations and schemas (Drizzle ORM).
- **`docs/`**: Documentation site (Docusaurus).

---

## 🎨 Design & Style Guidelines

We follow a **Nordic Minimalist** design philosophy. Please adhere to these standards for UI contributions.

### Core Principles

- **Clean & Airy**: Generous whitespace.
- **Calm Colors**: Soft paper-white backgrounds (`#f7f8fa`), muted text (`#6b7280`).
- **Soft Geometry**: `rounded-xl` for containers, `rounded-full` for buttons/inputs.

### Typography

- **Headings**: `Literata` (Serif) - Elegant, trustworthy.
- **UI/Body**: `Inter` (Sans-serif) - Clean, legible.

### Dark Mode

- We support **True Dark Mode** (#000000) for OLED screens to reduce eye strain during night reading.

_See `.antigravity/STYLEGUIDE.md` for full details._

---

## 📐 technical Standards

### Architecture

- **Local-First Sync**: Prefer local processing.
- **Importers**: All new import sources (e.g., Apple Books) must implement the `BaseImporter` strategy pattern.
- **Database**: We use **Drizzle ORM** with **PostgreSQL** + **pgvector** (384 dimensions).

### Testing

We use Vitest for running tests.

```bash
# Run API tests
cd lektr-api && npm test
```

Please add tests for any new logic or API endpoints.

### Adding a New Importer

All import sources implement the `BaseImporter` interface. Here's how to add support for a new source (e.g., Apple Books):

1. **Create the importer file**

   ```bash
   touch lektr-api/src/importers/applebooks.ts
   ```

2. **Implement the BaseImporter interface**

   ```typescript
   // lektr-api/src/importers/applebooks.ts
   import { BaseImporter, type ImportedBook } from "./base";

   export class AppleBooksImporter implements BaseImporter {
     readonly sourceType = "applebooks"; // Must match schema enum

     async validate(file: File): Promise<boolean> {
       // Return true if this importer can handle the file
       return file.name.endsWith(".plist") || file.type.includes("plist");
     }

     async parse(file: File): Promise<ImportedBook[]> {
       const content = await file.text();
       // Parse the file and return an array of books with highlights
       return [
         {
           title: "Book Title",
           author: "Author Name",
           externalId: "unique-id",
           highlights: [
             { content: "Highlight text", chapter: "Ch 1", page: 42 },
           ],
         },
       ];
     }
   }
   ```

3. **Register the importer**

   In `lektr-api/src/openapi/import.handlers.ts`:

   ```typescript
   import { AppleBooksImporter } from "../importers/applebooks";

   const importers: Record<string, BaseImporter> = {
     // ... existing importers
     applebooks: new AppleBooksImporter(),
   };
   ```

4. **Add the source type to the schema**

   In `lektr-api/src/db/schema.ts`, add your source to the enum:

   ```typescript
   export const sourceTypeEnum = pgEnum("source_type", [
     "koreader",
     "kindle",
     "applebooks", // Add this
     // ...
   ]);
   ```

5. **Create a migration**

   ```bash
   cd lektr-api && npm run db:generate
   ```

6. **Add tests**

   Create `lektr-api/tests/applebooks.test.ts` with validation and parsing tests.

---

## 🚀 Pull Request Process

1. **Fork** the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure your code lints and builds.
4. Issue that pull request!

### Branch Naming

- `feat/`: New features
- `fix/`: Bug fixes
- `docs/`: Documentation changes
- `refactor/`: Code improvements

---

## 🤝 Community

- [Open Collective](https://opencollective.com/lektr) - Support the project
- [GitHub Issues](https://github.com/lektr/lektr/issues) - Bug reports & features

Thank you for contributing!
