import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../db";
import { tags, highlightTags, highlights, bookTags, books as booksTable } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import {
  listTagsRoute,
  createTagRoute,
  getTagRoute,
  updateTagRoute,
  deleteTagRoute,
  addTagToHighlightRoute,
  removeTagFromHighlightRoute,
  getHighlightsByTagRoute,
  addTagToBookRoute,
  removeTagFromBookRoute,
  getBooksByTagRoute,
} from "./tags.routes";

// Default color palette
const defaultColors = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
];

export const tagsOpenAPI = new OpenAPIHono();
tagsOpenAPI.use("*", authMiddleware);

// GET / - List all tags
tagsOpenAPI.openapi(listTagsRoute, async (c) => {
  const user = c.get("user");
  
  // 1. Get base tags
  const userTags = await db
    .select()
    .from(tags)
    .where(eq(tags.userId, user.userId))
    .orderBy(tags.name);
  
  // 2. Get book counts
  const bookCountRows = await db.execute(sql`
    SELECT tag_id, count(*)::int as count 
    FROM book_tags 
    GROUP BY tag_id
  `);
  
  // 3. Get highlight counts
  const highlightCountRows = await db.execute(sql`
    SELECT tag_id, count(*)::int as count 
    FROM highlight_tags 
    GROUP BY tag_id
  `);
  
  // 4. Create lookup maps
  const bookMap = new Map();
  for (const row of bookCountRows) {
     const id = row.tag_id || row.tagId;
     const count = Number(row.count || 0);
     if (id) bookMap.set(id, count);
  }
  
  const highlightMap = new Map();
  for (const row of highlightCountRows) {
     const id = row.tag_id || row.tagId;
     const count = Number(row.count || 0);
     if (id) highlightMap.set(id, count);
  }
  
  return c.json({ 
    tags: userTags.map(t => ({ 
      ...t, 
      createdAt: t.createdAt.toISOString(),
      bookCount: bookMap.get(t.id) || 0,
      highlightCount: highlightMap.get(t.id) || 0
    })), 
    defaultColors 
  }, 200);
});

// POST / - Create tag
tagsOpenAPI.openapi(createTagRoute, async (c) => {
  const user = c.get("user");
  const { name, color } = c.req.valid("json");
  
  const existing = await db.select().from(tags)
    .where(and(eq(tags.userId, user.userId), eq(tags.name, name.toLowerCase())))
    .limit(1);
  
  if (existing.length > 0) {
    return c.json({ error: "Tag with this name already exists" }, 400);
  }
  
  const [newTag] = await db.insert(tags).values({
    userId: user.userId,
    name: name.toLowerCase(),
    color: color || defaultColors[Math.floor(Math.random() * defaultColors.length)],
  }).returning();
  
  return c.json({ tag: { ...newTag, createdAt: newTag.createdAt.toISOString() } }, 201);
});

// GET /:id - Get tag with books and highlights
tagsOpenAPI.openapi(getTagRoute, async (c) => {
  const user = c.get("user");
  const { id: tagId } = c.req.valid("param");
  
  const [tag] = await db.select().from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, user.userId))).limit(1);
  
  if (!tag) return c.json({ error: "Tag not found" }, 404);
  
  const taggedBooks = await db.select({
    id: booksTable.id, title: booksTable.title, author: booksTable.author, sourceType: booksTable.sourceType, coverImageUrl: booksTable.coverImageUrl,
  }).from(bookTags).innerJoin(booksTable, eq(bookTags.bookId, booksTable.id)).where(eq(bookTags.tagId, tagId));
  
  const taggedHighlights = await db.select({
    id: highlights.id, content: highlights.content, bookId: highlights.bookId,
    bookTitle: booksTable.title, bookAuthor: booksTable.author,
  }).from(highlightTags).innerJoin(highlights, eq(highlightTags.highlightId, highlights.id))
    .innerJoin(booksTable, eq(highlights.bookId, booksTable.id)).where(eq(highlightTags.tagId, tagId));
  
  return c.json({ tag: { ...tag, createdAt: tag.createdAt.toISOString() }, books: taggedBooks, highlights: taggedHighlights }, 200);
});

// PATCH /:id - Update tag
tagsOpenAPI.openapi(updateTagRoute, async (c) => {
  const user = c.get("user");
  const { id: tagId } = c.req.valid("param");
  const updates = c.req.valid("json");
  
  const [existingTag] = await db.select().from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, user.userId))).limit(1);
  
  if (!existingTag) return c.json({ error: "Tag not found" }, 404);
  
  if (updates.name) {
    const duplicate = await db.select().from(tags)
      .where(and(eq(tags.userId, user.userId), eq(tags.name, updates.name.toLowerCase()))).limit(1);
    if (duplicate.length > 0 && duplicate[0].id !== tagId) {
      return c.json({ error: "Tag with this name already exists" }, 400);
    }
  }
  
  const [updatedTag] = await db.update(tags).set({
    ...(updates.name !== undefined && { name: updates.name.toLowerCase() }),
    ...(updates.color !== undefined && { color: updates.color }),
  }).where(eq(tags.id, tagId)).returning();
  
  return c.json({ tag: { ...updatedTag, createdAt: updatedTag.createdAt.toISOString() } }, 200);
});

// DELETE /:id - Delete tag
tagsOpenAPI.openapi(deleteTagRoute, async (c) => {
  const user = c.get("user");
  const { id: tagId } = c.req.valid("param");
  
  const [tag] = await db.select().from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, user.userId))).limit(1);
  if (!tag) return c.json({ error: "Tag not found" }, 404);
  
  await db.delete(tags).where(eq(tags.id, tagId));
  return c.json({ success: true }, 200);
});

// POST /:id/highlights/:highlightId - Add tag to highlight
tagsOpenAPI.openapi(addTagToHighlightRoute, async (c) => {
  const user = c.get("user");
  const { id: tagId, highlightId } = c.req.valid("param");
  
  const [tag] = await db.select().from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, user.userId))).limit(1);
  if (!tag) return c.json({ error: "Tag not found" }, 404);
  
  const [highlight] = await db.select().from(highlights)
    .where(and(eq(highlights.id, highlightId), eq(highlights.userId, user.userId))).limit(1);
  if (!highlight) return c.json({ error: "Highlight not found" }, 404);
  
  const existing = await db.select().from(highlightTags)
    .where(and(eq(highlightTags.highlightId, highlightId), eq(highlightTags.tagId, tagId))).limit(1);
  if (existing.length > 0) return c.json({ success: true }, 201);
  
  await db.insert(highlightTags).values({ highlightId, tagId });
  return c.json({ success: true }, 201);
});

// DELETE /:id/highlights/:highlightId - Remove tag from highlight
tagsOpenAPI.openapi(removeTagFromHighlightRoute, async (c) => {
  const user = c.get("user");
  const { id: tagId, highlightId } = c.req.valid("param");
  
  const [tag] = await db.select().from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, user.userId))).limit(1);
  if (!tag) return c.json({ error: "Tag not found" }, 404);
  
  await db.delete(highlightTags)
    .where(and(eq(highlightTags.highlightId, highlightId), eq(highlightTags.tagId, tagId)));
  return c.json({ success: true }, 200);
});

// GET /:id/highlights - Get highlights by tag
tagsOpenAPI.openapi(getHighlightsByTagRoute, async (c) => {
  const user = c.get("user");
  const { id: tagId } = c.req.valid("param");
  
  const [tag] = await db.select().from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, user.userId))).limit(1);
  if (!tag) return c.json({ error: "Tag not found" }, 404);
  
  const taggedHighlights = await db.select({
    id: highlights.id, content: highlights.content, bookId: highlights.bookId,
    bookTitle: booksTable.title, bookAuthor: booksTable.author,
  }).from(highlightTags).innerJoin(highlights, eq(highlightTags.highlightId, highlights.id))
    .innerJoin(booksTable, eq(highlights.bookId, booksTable.id)).where(eq(highlightTags.tagId, tagId));
  
  return c.json({ tag: { ...tag, createdAt: tag.createdAt.toISOString() }, highlights: taggedHighlights }, 200);
});

// POST /:id/books/:bookId - Add tag to book
tagsOpenAPI.openapi(addTagToBookRoute, async (c) => {
  const user = c.get("user");
  const { id: tagId, bookId } = c.req.valid("param");
  
  const [tag] = await db.select().from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, user.userId))).limit(1);
  if (!tag) return c.json({ error: "Tag not found" }, 404);
  
  const [book] = await db.select().from(booksTable)
    .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, user.userId))).limit(1);
  if (!book) return c.json({ error: "Book not found" }, 404);
  
  const existing = await db.select().from(bookTags)
    .where(and(eq(bookTags.bookId, bookId), eq(bookTags.tagId, tagId))).limit(1);
  if (existing.length > 0) return c.json({ success: true }, 201);
  
  await db.insert(bookTags).values({ bookId, tagId });
  return c.json({ success: true }, 201);
});

// DELETE /:id/books/:bookId - Remove tag from book
tagsOpenAPI.openapi(removeTagFromBookRoute, async (c) => {
  const user = c.get("user");
  const { id: tagId, bookId } = c.req.valid("param");
  
  const [tag] = await db.select().from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, user.userId))).limit(1);
  if (!tag) return c.json({ error: "Tag not found" }, 404);
  
  await db.delete(bookTags).where(and(eq(bookTags.bookId, bookId), eq(bookTags.tagId, tagId)));
  return c.json({ success: true }, 200);
});

// GET /:id/books - Get books by tag
tagsOpenAPI.openapi(getBooksByTagRoute, async (c) => {
  const user = c.get("user");
  const { id: tagId } = c.req.valid("param");
  
  const [tag] = await db.select().from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, user.userId))).limit(1);
  if (!tag) return c.json({ error: "Tag not found" }, 404);
  
  const taggedBooks = await db.select({
    id: booksTable.id, title: booksTable.title, author: booksTable.author, sourceType: booksTable.sourceType, coverImageUrl: booksTable.coverImageUrl,
  }).from(bookTags).innerJoin(booksTable, eq(bookTags.bookId, booksTable.id)).where(eq(bookTags.tagId, tagId));
  
  return c.json({ tag: { ...tag, createdAt: tag.createdAt.toISOString() }, books: taggedBooks }, 200);
});
