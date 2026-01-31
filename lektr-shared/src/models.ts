// Domain Models - Core entities used across the application

/**
 * Supported import source types
 */
export type SourceType = "koreader" | "kindle" | "web" | "rss" | "manual" | "readwise" | "lektr";

/**
 * User account
 */
export interface User {
  id: string;
  email: string;
  role: "user" | "admin";
}

/**
 * Tag for organizing books and highlights
 */
export interface Tag {
  id: string;
  name: string;
  color: string | null;
  createdAt?: string;
  bookCount?: number;
  highlightCount?: number;
}

/**
 * Book with highlights
 */
export interface Book {
  id: string;
  title: string;
  author: string | null;
  sourceType: string;
  coverImageUrl: string | null;
  createdAt: string;
  highlightCount: number;
  lastHighlightedAt?: string | null;
  pinnedAt?: string | null;
  metadata?: Record<string, unknown>;
  tags?: Tag[];
}

/**
 * Individual highlight from a book
 */
export interface Highlight {
  id: string;
  content: string;
  originalContent: string | null;
  note: string | null;
  chapter: string | null;
  page: number | null;
  sourceUrl: string | null;
  tags?: Tag[];
}

/**
 * Highlight for spaced repetition review
 */
export interface ReviewItem {
  id: string;
  content: string;
  note: string | null;
  chapter: string | null;
  page: number | null;
  book: { title: string; author: string | null };
}
