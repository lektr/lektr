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
  // Context fields
  bookId?: string;
  bookTitle?: string;
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

/**
 * Deck type - manual or smart (tag-based)
 */
export type DeckType = "manual" | "smart";

/**
 * Tag logic for smart decks
 */
export type TagLogic = "AND" | "OR";

/**
 * Card type
 */
export type CardType = "basic" | "cloze";

/**
 * FSRS scheduling data
 */
export interface FSRSData {
  stability: number;
  difficulty: number;
  due: string;
  state: number;
  lastReview: string | null;
}

/**
 * Deck settings
 */
export interface DeckSettings {
  fsrsParams?: Record<string, unknown>;
  includeRawHighlights?: boolean;
  autoGenerateTemplate?: string;
}

/**
 * Flashcard deck
 */
export interface Deck {
  id: string;
  title: string;
  description: string | null;
  type: DeckType;
  tagLogic: TagLogic | null;
  settings: DeckSettings | null;
  createdAt: string;
  updatedAt: string;
  // Computed fields for UI
  cardCount?: number;
  dueCount?: number;
  tags?: Tag[];
}

/**
 * Individual flashcard
 */
export interface Flashcard {
  id: string;
  deckId: string;
  highlightId: string | null;
  front: string;
  back: string;
  cardType: CardType;
  fsrsData: FSRSData | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated for UI
  highlight?: Highlight;
}

/**
 * Virtual card (raw highlight presented as card)
 */
export interface VirtualCard {
  highlightId: string;
  front: string;
  back: string;
  isVirtual: true;
  highlight: Highlight;
}
