---
slug: /
sidebar_position: 1
---

# Welcome to Lektr

**Lektr** is a self-hosted platform designed to help you **stop forgetting what you read**. It aggregates highlights from Kindle, KOReader, and other sources, then uses **spaced repetition** to help you internalize the ideas that matter most.

## Key Features

- 📚 **Import highlights** from Kindle, KOReader, Readwise, and manual entry
- 🔍 **Semantic search** using AI-powered hybrid search (RRF)
- 🏷️ **Organize with tags** for books and individual highlights
- 📖 **Spaced repetition review** using FSRS algorithm
- 📧 **Daily digest emails** with highlights due for review
- 📤 **Export** to Markdown, Obsidian, Notion, and Readwise

## Quick Links

- [Installation Guide](/getting-started/installation) - Get Lektr running with Docker
- [Configuration](/configuration/environment) - Environment variables and settings
- [Email Setup](/admin/email-setup) - Configure SMTP for transactional emails

## Architecture

Lektr consists of three main components:

| Component      | Technology | Purpose                     |
| -------------- | ---------- | --------------------------- |
| **lektr-api**  | Bun + Hono | REST API backend            |
| **lektr-ui**   | Next.js    | Web frontend                |
| **PostgreSQL** | pgvector   | Database with vector search |

## Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/lektr/lektr/issues)
- **Source Code**: [View on GitHub](https://github.com/lektr/lektr)
