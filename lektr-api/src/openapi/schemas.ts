import { z } from "@hono/zod-openapi";

// ============================================
// Auth Schemas
// ============================================

export const RegisterSchema = z
  .object({
    email: z.string().email().openapi({ example: "user@example.com" }),
    password: z.string().min(8).openapi({ example: "securepassword123" }),
  })
  .openapi("RegisterRequest");

export const LoginSchema = z
  .object({
    email: z.string().email().openapi({ example: "user@example.com" }),
    password: z.string().openapi({ example: "securepassword123" }),
  })
  .openapi("LoginRequest");

export const UserSchema = z
  .object({
    id: z.string().openapi({ example: "abc123" }),
    email: z.string().email().openapi({ example: "user@example.com" }),
    role: z.enum(["user", "admin"]).openapi({ example: "user" }),
  })
  .openapi("User");

export const AuthSuccessSchema = z
  .object({
    success: z.boolean(),
    user: UserSchema,
  })
  .openapi("AuthSuccess");

export const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: "Something went wrong" }),
  })
  .openapi("Error");

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().openapi({ example: "oldpassword123" }),
    newPassword: z.string().min(8).openapi({ example: "newsecurepassword456" }),
  })
  .openapi("ChangePasswordRequest");

// ============================================
// Book Schemas
// ============================================

export const TagSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable(),
  })
  .openapi("Tag");

export const BookSummarySchema = z
  .object({
    id: z.string(),
    title: z.string(),
    author: z.string().nullable(),
    sourceType: z.string(),
    coverImageUrl: z.string().nullable(),
    highlightCount: z.number(),
    lastHighlightedAt: z.string().nullable(),
    createdAt: z.string(),
    tags: z.array(TagSchema),
  })
  .openapi("BookSummary");

export const HighlightSchema = z
  .object({
    id: z.string(),
    content: z.string(),
    originalContent: z.string().nullable(),
    note: z.string().nullable(),
    location: z.string().nullable(),
    chapter: z.string().nullable(),
    page: z.number().nullable(),
    createdAt: z.string(),
    tags: z.array(TagSchema),
  })
  .openapi("Highlight");

export const BookDetailSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    author: z.string().nullable(),
    sourceType: z.string(),
    coverImageUrl: z.string().nullable(),
    metadata: z.any().nullable(),
    createdAt: z.string(),
    tags: z.array(TagSchema),
  })
  .openapi("BookDetail");

export const BooksListSchema = z
  .object({
    books: z.array(BookSummarySchema),
  })
  .openapi("BooksList");

export const BookWithHighlightsSchema = z
  .object({
    book: BookDetailSchema,
    highlights: z.array(HighlightSchema),
  })
  .openapi("BookWithHighlights");

// ============================================
// Review Schemas
// ============================================

export const ReviewCardSchema = z
  .object({
    id: z.string(),
    highlightId: z.string(),
    highlight: HighlightSchema,
    book: z.object({
      id: z.string(),
      title: z.string(),
      author: z.string().nullable(),
    }),
    dueAt: z.string(),
    stability: z.number(),
    difficulty: z.number(),
    reps: z.number(),
  })
  .openapi("ReviewCard");

export const ReviewResponseSchema = z
  .object({
    rating: z.enum(["again", "hard", "good", "easy"]),
  })
  .openapi("ReviewResponse");

// ============================================
// Search Schemas
// ============================================

export const SearchResultSchema = z
  .object({
    highlights: z.array(
      z.object({
        id: z.string(),
        content: z.string(),
        note: z.string().nullable(),
        bookId: z.string(),
        bookTitle: z.string(),
        bookAuthor: z.string().nullable(),
        similarity: z.number().optional(),
      }),
    ),
  })
  .openapi("SearchResult");
