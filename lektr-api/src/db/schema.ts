import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  integer,
  vector,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const sourceTypeEnum = pgEnum("source_type", [
  "koreader",
  "kindle",
  "web",
  "rss",
  "manual",
  "readwise",
  "lektr",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
]);

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "admin",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// Users Table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  resetToken: text("reset_token"),
  resetTokenExpires: timestamp("reset_token_expires", { withTimezone: true }),
  digestEnabled: text("digest_enabled").default("true"), // 'true' or 'false'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Jobs Table (for email queue and other background tasks)
export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // 'email', 'digest', etc.
  payload: jsonb("payload").notNull(), // { to, subject, template, variables }
  status: jobStatusEnum("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  lastError: text("last_error"),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// Books Table
export const books = pgTable("books", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  author: text("author"),
  sourceType: sourceTypeEnum("source_type").notNull(),
  externalId: text("external_id"),
  coverImageUrl: text("cover_image_url"),
  metadata: jsonb("metadata"),
  pinnedAt: timestamp("pinned_at", { withTimezone: true }), // null = not pinned
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Highlights Table
export const highlights = pgTable("highlights", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookId: uuid("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  originalContent: text("original_content"), // Immutable original imported text
  contentHash: text("content_hash"), // Stable hash for deduplication
  sourceUrl: text("source_url"),
  note: text("note"),
  chapter: text("chapter"),
  page: integer("page"),
  positionPercent: integer("position_percent"),
  embedding: vector("embedding", { dimensions: 384 }),
  fsrsCard: jsonb("fsrs_card"),
  highlightedAt: timestamp("highlighted_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete marker
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

// Sync History Table
export const syncHistory = pgTable("sync_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sourceType: sourceTypeEnum("source_type").notNull(),
  status: syncStatusEnum("status").notNull().default("pending"),
  itemsProcessed: integer("items_processed").default(0),
  itemsTotal: integer("items_total").default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  books: many(books),
  highlights: many(highlights),
  syncHistory: many(syncHistory),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  user: one(users, {
    fields: [books.userId],
    references: [users.id],
  }),
  highlights: many(highlights),
  bookTags: many(bookTags),
}));

export const highlightsRelations = relations(highlights, ({ one, many }) => ({
  book: one(books, {
    fields: [highlights.bookId],
    references: [books.id],
  }),
  user: one(users, {
    fields: [highlights.userId],
    references: [users.id],
  }),
  highlightTags: many(highlightTags),
}));

export const syncHistoryRelations = relations(syncHistory, ({ one }) => ({
  user: one(users, {
    fields: [syncHistory.userId],
    references: [users.id],
  }),
}));

// Settings Table (admin-configurable key-value pairs)
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Tags Table - user-defined tags for organizing books and highlights
export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color"), // hex color for UI display, e.g., "#3b82f6"
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Highlight-Tags Junction Table (many-to-many)
export const highlightTags = pgTable("highlight_tags", {
  highlightId: uuid("highlight_id")
    .notNull()
    .references(() => highlights.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: { columns: [table.highlightId, table.tagId] },
}));

// Book-Tags Junction Table (many-to-many)
export const bookTags = pgTable("book_tags", {
  bookId: uuid("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: { columns: [table.bookId, table.tagId] },
}));

// Tag Relations
export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  highlightTags: many(highlightTags),
  bookTags: many(bookTags),
}));

export const highlightTagsRelations = relations(highlightTags, ({ one }) => ({
  highlight: one(highlights, {
    fields: [highlightTags.highlightId],
    references: [highlights.id],
  }),
  tag: one(tags, {
    fields: [highlightTags.tagId],
    references: [tags.id],
  }),
}));

export const bookTagsRelations = relations(bookTags, ({ one }) => ({
  book: one(books, {
    fields: [bookTags.bookId],
    references: [books.id],
  }),
  tag: one(tags, {
    fields: [bookTags.tagId],
    references: [tags.id],
  }),
}));

