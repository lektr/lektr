// API Types - Request/Response types for the Lektr API

import type { SourceType } from "./models";

/**
 * Pending metadata update for a book (from enrichment service)
 */
export interface PendingMetadataUpdate {
  bookId: string;
  bookTitle: string;
  current: {
    coverImageUrl?: string | null;
    description?: string;
  };
  available: {
    coverImageUrl?: string;
    description?: string;
    pageCount?: number;
    publishedDate?: string;
    genres?: string[];
  };
}

/**
 * Book breakdown item in import result
 */
export interface ImportBookBreakdown {
  bookId: string;
  title: string;
  highlightCount: number;
}

/**
 * Result of importing highlights
 */
export interface ImportResult {
  success: boolean;
  booksImported: number;
  highlightsImported: number;
  highlightsSkipped?: number;
  syncHistoryId: string;
  errors?: string[];
  pendingUpdates?: PendingMetadataUpdate[];
  bookBreakdown?: ImportBookBreakdown[];
}

/**
 * Parsed book from import file (internal to importer)
 */
export interface ParsedBook {
  title: string;
  author?: string;
  externalId?: string;
  coverImageUrl?: string;
  metadata?: Record<string, unknown>;
  highlights: ParsedHighlight[];
}

/**
 * Parsed highlight from import file (internal to importer)
 */
export interface ParsedHighlight {
  content: string;
  note?: string;
  chapter?: string;
  page?: number;
  positionPercent?: number;
  highlightedAt?: Date;
}

/**
 * Semantic search result
 */
export interface SearchResult {
  id: string;
  content: string;
  chapter: string | null;
  page: number | null;
  bookId: string;
  bookTitle: string;
  bookAuthor: string | null;
  coverImageUrl: string | null;
  similarity: number;
  tags?: { id: string; name: string; color: string | null }[];
}
