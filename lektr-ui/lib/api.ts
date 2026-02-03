// API base URL from environment variable. Empty string = relative paths (Nginx proxy)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// Import types from shared package for use in this file
import type { User, Book, Tag, Highlight, ReviewItem, PendingMetadataUpdate, ImportResult } from "@lektr/shared";

// Re-export types for consumers of this module
export type { User, Book, Tag, Highlight, ReviewItem, PendingMetadataUpdate } from "@lektr/shared";
export type { ImportResult as ImportResponse } from "@lektr/shared";

export function getCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/api/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}
// Auth API
export async function register(email: string, password: string): Promise<{ user: User }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Registration failed");
  }

  return response.json();
}

export async function login(email: string, password: string): Promise<{ user: User }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Login failed");
  }

  return response.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function getCurrentUser(): Promise<{ user: User } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to change password");
  }

  return response.json();
}

export async function changeEmail(newEmail: string, password: string): Promise<{ success: boolean; email: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/email`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ newEmail, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to change email");
  }

  return response.json();
}

// Books API
export async function getBooks(): Promise<{ books: Book[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/books`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch books");
  }

  return response.json();
}

export async function getBook(id: string): Promise<{ book: Book; highlights: Highlight[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/books/${id}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch book");
  }

  return response.json();
}

// Review API
export async function getReviewQueue(): Promise<{ items: ReviewItem[]; total: number }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/review`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch review queue");
  }

  return response.json();
}

export async function submitRating(
  highlightId: string,
  rating: "again" | "hard" | "good" | "easy"
): Promise<{ success: boolean; nextReview: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/review/${highlightId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ rating }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to submit rating");
  }

  return response.json();
}

// Import API
export async function importHighlights(
  file: File,
  source: string
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("source", source);
  // userId is now extracted from auth session on the server

  const response = await fetch(`${API_BASE_URL}/api/v1/import`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json();
    let message = data.error || data.message || "Import failed";

    // Handle ZodError object
    if (typeof message === 'object' && message !== null) {
      if (message.name === 'ZodError' && Array.isArray(message.issues)) {
        message = message.issues.map((i: { path: string[]; message: string }) => `${i.path.join('.')}: ${i.message}`).join(', ');
      } else {
        message = JSON.stringify(message);
      }
    }

    const details = data.details || "";
    throw new Error(details ? `${message}: ${details}` : message);
  }

  return response.json();
}

export async function updateBookMetadata(
  bookId: string,
  metadata: {
    coverImageUrl?: string;
    description?: string;
    pageCount?: number;
    publishedDate?: string;
    genres?: string[];
  }
): Promise<{ success: boolean; bookId: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/books/${bookId}/metadata`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update metadata");
  }

  return response.json();
}

export async function deleteBook(bookId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/books/${bookId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete book");
  }

  return response.json();
}

export async function toggleBookPin(bookId: string): Promise<{ success: boolean; pinned: boolean; pinnedAt: string | null }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/books/${bookId}/pin`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to toggle pin");
  }

  return response.json();
}

export async function deleteHighlight(
  bookId: string,
  highlightId: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/books/${bookId}/highlights/${highlightId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete highlight");
  }

  return response.json();
}

export async function updateBook(
  bookId: string,
  data: { title?: string; author?: string }
): Promise<{ success: boolean; bookId: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/books/${bookId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update book");
  }

  return response.json();
}

export async function updateHighlight(
  bookId: string,
  highlightId: string,
  data: { content?: string; note?: string | null }
): Promise<{ success: boolean; highlightId: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/books/${bookId}/highlights/${highlightId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update highlight");
  }

  return response.json();
}

export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/health`);
  return response.json();
}

// Search API
export interface SearchResult {
  id: string;
  content: string;
  chapter?: string;
  page?: number;
  bookId: string;
  bookTitle: string;
  bookAuthor?: string;
  coverImageUrl?: string;
  similarity: number;
  tags: { id: string; name: string; color: string | null }[];
  tagBoost?: boolean;
}

export interface RelatedTag {
  id: string;
  name: string;
  color: string | null;
  count: number;
}

export interface SearchResponse {
  query: string;
  filterTagIds: string[];
  results: SearchResult[];
  relatedTags: RelatedTag[];
}

export interface EmbeddingStatus {
  embeddings: {
    complete: number;
    pending: number;
  };
  queue: {
    pending: number;
    processing: boolean;
  };
  modelLoaded: boolean;
}

export async function searchHighlights(
  query: string,
  options?: { limit?: number; tagIds?: string[] }
): Promise<SearchResponse> {
  const { limit = 10, tagIds = [] } = options || {};

  let url = `${API_BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&limit=${limit}`;

  if (tagIds.length > 0) {
    url += `&tagIds=${tagIds.join(",")}`;
  }

  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Search failed");
  }

  return response.json();
}

export async function getEmbeddingStatus(): Promise<EmbeddingStatus> {
  const response = await fetch(`${API_BASE_URL}/api/v1/search/status`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get embedding status");
  }

  return response.json();
}

export async function generateEmbeddings(): Promise<{ queued: number }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/search/generate-embeddings`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to generate embeddings");
  }

  return response.json();
}

export async function getVersion(): Promise<{ version: string; name: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/version`);
  if (!response.ok) {
    throw new Error("Failed to get version");
  }
  return response.json();
}

// Settings API
export interface SettingsResponse {
  settings: Record<string, { value: string; description: string | null }>;
}

export async function getSettings(): Promise<SettingsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/settings`);
  if (!response.ok) {
    throw new Error("Failed to get settings");
  }
  return response.json();
}

export async function updateSettings(
  settings: Record<string, string>
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ settings }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update settings");
  }

  return response.json();
}

// Admin API
export async function refreshMissingMetadata(): Promise<{ queued: number; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/refresh-metadata`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to refresh metadata");
  }

  return response.json();
}

export async function refreshBookCover(bookId: string): Promise<{ success: boolean; coverImageUrl?: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/refresh-metadata/${bookId}`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to refresh cover");
  }

  return response.json();
}

export async function checkLengthReduction(
  newLimit: number
): Promise<{ affectedCount: number; newLimit: number }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/settings/check-reduction?limit=${newLimit}`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error("Failed to check reduction impact");
  }

  return response.json();
}

// Tags API

export interface TagsResponse {
  tags: Tag[];
  defaultColors: string[];
}

export async function getTags(): Promise<TagsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tags`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch tags");
  }

  return response.json();
}

export interface TagDetailHighlight {
  id: string;
  content: string;
  note: string | null;
  chapter: string | null;
  page: number | null;
  bookId: string;
  bookTitle: string;
  bookAuthor: string | null;
}

export interface TagDetailBook {
  id: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  sourceType: string;
}

export interface TagDetailResponse {
  tag: Tag;
  books: TagDetailBook[];
  highlights: TagDetailHighlight[];
}

export async function getTag(tagId: string): Promise<TagDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tags/${tagId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch tag");
  }

  return response.json();
}

export async function createTag(
  name: string,
  color?: string
): Promise<{ tag: Tag }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, color }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create tag");
  }

  return response.json();
}

export async function updateTag(
  tagId: string,
  data: { name?: string; color?: string | null }
): Promise<{ tag: Tag }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tags/${tagId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update tag");
  }

  return response.json();
}

export async function deleteTag(tagId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tags/${tagId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete tag");
  }

  return response.json();
}

export async function addTagToHighlight(
  tagId: string,
  highlightId: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/tags/${tagId}/highlights/${highlightId}`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add tag");
  }

  return response.json();
}

export async function removeTagFromHighlight(
  tagId: string,
  highlightId: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/tags/${tagId}/highlights/${highlightId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove tag");
  }

  return response.json();
}

// Book Tag API Functions
export async function addTagToBook(
  tagId: string,
  bookId: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/tags/${tagId}/books/${bookId}`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add tag to book");
  }

  return response.json();
}

export async function removeTagFromBook(
  tagId: string,
  bookId: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/tags/${tagId}/books/${bookId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove tag from book");
  }

  return response.json();
}

// Export API
export interface ExportProvider {
  id: string;
  name: string;
  description: string;
  icon?: string;
  requiresAuth: boolean;
}

export async function getExportProviders(): Promise<{ providers: ExportProvider[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/export/providers`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch export providers");
  }

  return response.json();
}

export interface ExportOptions {
  bookIds?: string[];
  includeNotes?: boolean;
  includeTags?: boolean;
  config?: Record<string, unknown>;
}

export async function triggerExport(
  providerId: string,
  options: ExportOptions
): Promise<Blob | { message: string; redirect?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/export/${providerId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Export failed");
  }

  // Check if it's a file download or JSON response
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  // It's a file - return as blob
  return response.blob();
}

// Manual Entry API
export interface ManualHighlightInput {
  title: string;
  author?: string;
  bookId?: string;  // If provided, adds to existing book instead of creating new
  content: string;
  note?: string;
  chapter?: string;
  page?: number;
}

export interface ManualHighlightResult {
  message: string;
  bookId: string;
  bookCreated: boolean;
  highlightId: string;
}

export async function addManualHighlight(
  data: ManualHighlightInput
): Promise<ManualHighlightResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/import/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add highlight");
  }

  return response.json();
}

// Email Settings API
export interface EmailSettings {
  smtp_host?: string;
  smtp_port?: string;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_secure?: string;
  mail_from_name?: string;
  mail_from_email?: string;
}

export interface EmailSettingsResponse {
  settings: EmailSettings;
  isConfigured: boolean;
  envFallback: boolean;
}

export async function getEmailSettings(): Promise<EmailSettingsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/email-settings`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch email settings");
  }

  return response.json();
}

export async function updateEmailSettings(settings: EmailSettings): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/email-settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update email settings");
  }

  return response.json();
}

export async function sendTestEmail(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/email-settings/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    return { success: false, error: data.error || "Test failed" };
  }

  return data;
}

// Trash API
export interface DeletedHighlight {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string | null;
  content: string;
  note: string | null;
  chapter: string | null;
  page: number | null;
  deletedAt: string;
  highlightedAt: string | null;
}

export async function getDeletedHighlights(): Promise<{ highlights: DeletedHighlight[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/trash`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch trash");
  }

  return response.json();
}

export async function restoreHighlight(highlightId: string): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/books/highlights/${highlightId}/restore`,
    {
      method: "PATCH",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to restore highlight");
  }

  return response.json();
}

export async function hardDeleteHighlight(highlightId: string): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/books/highlights/${highlightId}/permanent`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to permanently delete highlight");
  }

  return response.json();
}

// Digest API
export async function triggerDigest(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/trigger-digest`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to trigger digest");
  }

  return response.json();
}
