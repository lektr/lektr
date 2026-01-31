---
sidebar_position: 2
---

# Search

Lektr provides powerful semantic search across your entire highlight library.

## How It Works

Lektr uses **hybrid search** combining:
- **Vector similarity** (semantic/AI-based)
- **Full-text search** (keyword matching)
- **Reciprocal Rank Fusion (RRF)** to combine results

This means you can search for concepts, not just exact words.

## Using Search

1. Navigate to **Search**
2. Enter your query
3. Results show matching highlights with:
   - Highlighted matching text
   - Book title and author
   - Relevance score

## Search Tips

### Conceptual Searches

Search for ideas, not just keywords:
- "dealing with failure" finds highlights about resilience, setbacks, learning from mistakes
- "time management" finds productivity-related highlights

### Multi-word Queries

Use natural language:
- "how to build habits"
- "importance of reading"

### Author/Book Searches

Include book or author names:
- "Atomic Habits routines"
- "Seneca stoicism"

## Technical Details

### Vector Embeddings

Highlights are embedded using AI models and stored in PostgreSQL with the pgvector extension. This enables semantic similarity search.

### Search Pipeline

```
Query → Embedding → Vector Search ─┐
                                    ├─→ RRF → Ranked Results
Query → Text Search ───────────────┘
```

### Re-generating Embeddings

If you modify embedding settings, regenerate via:

```bash
curl -X POST /api/v1/admin/embeddings/regenerate \
  -H "Cookie: auth_token=TOKEN"
```
