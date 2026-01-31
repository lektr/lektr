import { OpenAPIHono } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db";
import { embeddingService } from "../services/embeddings";
import { embeddingQueue } from "../services/embedding-queue";
import {
  searchRoute,
  generateEmbeddingsRoute,
  getEmbeddingStatusRoute,
} from "./search.routes";

const TAG_BOOST_FACTOR = 0.10;

export const searchOpenAPI = new OpenAPIHono();
searchOpenAPI.use("*", authMiddleware);

// GET / - Hybrid search with Reciprocal Rank Fusion (RRF)
searchOpenAPI.openapi(searchRoute, async (c) => {
  const user = c.get("user");
  const { q: query, tagIds: tagIdsParam, limit: limitParam } = c.req.valid("query");
  const limit = Math.min(parseInt(limitParam || "10"), 50);
  const filterTagIds = tagIdsParam ? tagIdsParam.split(",").filter(id => id.trim().length > 0) : [];

  if (!query || query.trim().length === 0) {
    return c.json({ error: "Query parameter 'q' is required" }, 400);
  }

  // RRF constant (standard value)
  const RRF_K = 60;
  
  // Fetch more results than needed for better fusion (we'll trim later)
  const fetchLimit = Math.min(limit * 3, 100);

  // Generate query embedding for semantic search
  const queryEmbedding = await embeddingService.generateEmbedding(query);
  if (!queryEmbedding) {
    return c.json({ error: "Failed to generate query embedding" }, 400);
  }

  // Prepare tag filter clause
  const tagFilterClause = filterTagIds.length > 0 
    ? sql`AND (
        EXISTS (SELECT 1 FROM highlight_tags ht WHERE ht.highlight_id = h.id AND ht.tag_id = ANY(${`{${filterTagIds.join(",")}}`}::uuid[]))
        OR EXISTS (SELECT 1 FROM book_tags bt WHERE bt.book_id = h.book_id AND bt.tag_id = ANY(${`{${filterTagIds.join(",")}}`}::uuid[]))
      )`
    : sql``;

  // Run both searches in parallel
  const [semanticResults, keywordResults] = await Promise.all([
    // Semantic search (vector similarity)
    db.execute(sql`
      SELECT h.id, h.content, h.chapter, h.page, h.book_id, b.title as book_title, b.author as book_author, b.cover_image_url,
        1 - (h.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as semantic_score
      FROM highlights h JOIN books b ON h.book_id = b.id
      WHERE h.user_id = ${user.userId} AND h.embedding IS NOT NULL ${tagFilterClause}
      ORDER BY h.embedding <=> ${JSON.stringify(queryEmbedding)}::vector 
      LIMIT ${fetchLimit}
    `),
    // Keyword search (PostgreSQL full-text search)
    db.execute(sql`
      SELECT h.id, h.content, h.chapter, h.page, h.book_id, b.title as book_title, b.author as book_author, b.cover_image_url,
        ts_rank_cd(
          to_tsvector('english', coalesce(h.content, '') || ' ' || coalesce(b.title, '') || ' ' || coalesce(b.author, '')),
          plainto_tsquery('english', ${query})
        ) as keyword_score
      FROM highlights h JOIN books b ON h.book_id = b.id
      WHERE h.user_id = ${user.userId} 
        AND to_tsvector('english', coalesce(h.content, '') || ' ' || coalesce(b.title, '') || ' ' || coalesce(b.author, '')) 
            @@ plainto_tsquery('english', ${query})
        ${tagFilterClause}
      ORDER BY keyword_score DESC
      LIMIT ${fetchLimit}
    `)
  ]);

  const semanticRows = Array.isArray(semanticResults) ? semanticResults : (semanticResults as any)?.rows || [];
  const keywordRows = Array.isArray(keywordResults) ? keywordResults : (keywordResults as any)?.rows || [];

  // Build rank maps (1-indexed)
  const semanticRankMap = new Map<string, number>();
  semanticRows.forEach((row: any, index: number) => {
    semanticRankMap.set(row.id, index + 1);
  });

  const keywordRankMap = new Map<string, number>();
  keywordRows.forEach((row: any, index: number) => {
    keywordRankMap.set(row.id, index + 1);
  });

  // Merge all unique results
  const allResultsMap = new Map<string, any>();
  for (const row of semanticRows) {
    allResultsMap.set((row as any).id, row);
  }
  for (const row of keywordRows) {
    if (!allResultsMap.has((row as any).id)) {
      allResultsMap.set((row as any).id, row);
    }
  }

  // Calculate RRF scores
  const rrfResults: Array<{ row: any; rrfScore: number; semanticRank: number | null; keywordRank: number | null }> = [];
  
  for (const [id, row] of allResultsMap) {
    const semanticRank = semanticRankMap.get(id);
    const keywordRank = keywordRankMap.get(id);
    
    // RRF formula: sum of 1/(k+rank) for each ranking
    let rrfScore = 0;
    if (semanticRank !== undefined) {
      rrfScore += 1 / (RRF_K + semanticRank);
    }
    if (keywordRank !== undefined) {
      rrfScore += 1 / (RRF_K + keywordRank);
    }
    
    rrfResults.push({ row, rrfScore, semanticRank: semanticRank ?? null, keywordRank: keywordRank ?? null });
  }

  // Sort by RRF score descending
  rrfResults.sort((a, b) => b.rrfScore - a.rrfScore);
  
  // Take top N results
  const topResults = rrfResults.slice(0, limit);
  const rows = topResults.map(r => r.row);
  const highlightIds = rows.map((r: any) => r.id);
  const bookIds = [...new Set(rows.map((r: any) => r.book_id))];

  // Fetch highlight-level tags
  let highlightTagsMap = new Map<string, { id: string; name: string; color: string | null }[]>();
  if (highlightIds.length > 0) {
    const highlightIdsArray = `{${highlightIds.join(",")}}`;
    const tagsResult = await db.execute(sql`
      SELECT ht.highlight_id, t.id, t.name, t.color FROM highlight_tags ht JOIN tags t ON ht.tag_id = t.id
      WHERE ht.highlight_id = ANY(${highlightIdsArray}::uuid[])
    `);
    const tagsRows = Array.isArray(tagsResult) ? tagsResult : (tagsResult as any)?.rows || [];
    for (const row of tagsRows) {
      const highlightId = (row as any).highlight_id;
      if (!highlightTagsMap.has(highlightId)) highlightTagsMap.set(highlightId, []);
      highlightTagsMap.get(highlightId)!.push({ id: (row as any).id, name: (row as any).name, color: (row as any).color });
    }
  }

  // Fetch book-level tags
  let bookTagsMap = new Map<string, { id: string; name: string; color: string | null }[]>();
  if (bookIds.length > 0) {
    const bookIdsArray = `{${bookIds.join(",")}}`;
    const bookTagsResult = await db.execute(sql`
      SELECT bt.book_id, t.id, t.name, t.color FROM book_tags bt JOIN tags t ON bt.tag_id = t.id
      WHERE bt.book_id = ANY(${bookIdsArray}::uuid[])
    `);
    const bookTagsRows = Array.isArray(bookTagsResult) ? bookTagsResult : (bookTagsResult as any)?.rows || [];
    for (const row of bookTagsRows) {
      const bookId = (row as any).book_id;
      if (!bookTagsMap.has(bookId)) bookTagsMap.set(bookId, []);
      bookTagsMap.get(bookId)!.push({ id: (row as any).id, name: (row as any).name, color: (row as any).color });
    }
  }

  // Merge tags and build final results
  const filterTagIdSet = new Set(filterTagIds);
  const tagCounts = new Map<string, { id: string; name: string; color: string | null; count: number }>();
  
  const resultsWithTags = topResults.map(({ row, rrfScore, keywordRank }) => {
    const highlightTags = highlightTagsMap.get(row.id) || [];
    const bookTags = bookTagsMap.get(row.book_id) || [];
    
    // Merge and deduplicate tags
    const tagMap = new Map<string, { id: string; name: string; color: string | null }>();
    for (const tag of highlightTags) tagMap.set(tag.id, tag);
    for (const tag of bookTags) {
      if (!tagMap.has(tag.id)) tagMap.set(tag.id, tag);
    }
    const mergedTags = Array.from(tagMap.values());
    
    // Count for relatedTags
    for (const tag of mergedTags) {
      const existing = tagCounts.get(tag.id);
      if (existing) existing.count++;
      else tagCounts.set(tag.id, { ...tag, count: 1 });
    }
    
    const hasMatchingTag = filterTagIds.length > 0 && mergedTags.some(t => filterTagIdSet.has(t.id));
    
    // Normalize RRF score to 0-1 range for display (max possible is ~0.033 for rank 1 in both)
    const normalizedScore = Math.min(rrfScore * 30, 1.0);
    
    return {
      id: row.id, 
      content: row.content, 
      chapter: row.chapter, 
      page: row.page,
      bookId: row.book_id, 
      bookTitle: row.book_title, 
      bookAuthor: row.book_author,
      coverImageUrl: row.cover_image_url, 
      similarity: normalizedScore, 
      tags: mergedTags, 
      tagBoost: keywordRank !== null, // Indicate if keyword match contributed
    };
  });
  
  const relatedTags = Array.from(tagCounts.values()).sort((a, b) => b.count - a.count).slice(0, 10);

  return c.json({ query, filterTagIds, results: resultsWithTags, relatedTags }, 200);
});

// POST /generate-embeddings - Queue embedding generation
searchOpenAPI.openapi(generateEmbeddingsRoute, async (c) => {
  const user = c.get("user");
  
  const results = await db.execute(sql`
    SELECT h.id, h.content FROM highlights h
    WHERE h.user_id = ${user.userId} AND h.embedding IS NULL LIMIT 500
  `);

  const rows = Array.isArray(results) ? results : (results as any)?.rows || [];
  if (rows.length > 0) {
    embeddingQueue.addBatch(rows.map((row: any) => ({ highlightId: row.id, content: row.content })));
  }

  return c.json({ message: `Queued ${rows.length} highlights for embedding generation`, queued: rows.length }, 200);
});

// GET /status - Get embedding status
searchOpenAPI.openapi(getEmbeddingStatusRoute, async (c) => {
  const user = c.get("user");
  
  const results = await db.execute(sql`
    SELECT COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings,
           COUNT(*) FILTER (WHERE embedding IS NULL) as without_embeddings
    FROM highlights WHERE user_id = ${user.userId}
  `);

  const queueStatus = embeddingQueue.getStatus();
  const rows = Array.isArray(results) ? results : (results as any)?.rows || [];
  const row = rows[0] || { with_embeddings: '0', without_embeddings: '0' };

  return c.json({
    embeddings: { complete: parseInt(row.with_embeddings as string) || 0, pending: parseInt(row.without_embeddings as string) || 0 },
    queue: queueStatus,
    modelLoaded: embeddingService.isLoaded(),
  }, 200);
});
