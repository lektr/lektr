import { OpenAPIHono } from "@hono/zod-openapi";
import { eq, and } from "drizzle-orm";
import type { SourceType, PendingMetadataUpdate } from "../types";
import { books, highlights as highlightsTable, syncHistory } from "../db/schema";
import { db } from "../db";
import { KOReaderImporter } from "../importers/koreader";
import { KindleImporter } from "../importers/kindle";
import { ReadwiseImporter } from "../importers/readwise";
import { LektrImporter } from "../importers/lektr";
import { embeddingQueue } from "../services/embedding-queue";
import { metadataQueue } from "../services/metadata-queue";
import { metadataService } from "../services/metadata";
import { downloadCover } from "../services/covers";
import { telemetryService } from "../services/telemetry";
import { authMiddleware } from "../middleware/auth";
import { getSetting } from "./settings.handlers";
import { importRoute } from "./import.routes";
import type { BaseImporter } from "../importers/base";

const importers: Record<string, BaseImporter> = {
  koreader: new KOReaderImporter(),
  kindle: new KindleImporter(),
  readwise: new ReadwiseImporter(),
  lektr: new LektrImporter(),
};

function generateContentHash(content: string): string {
  const normalized = content.slice(0, 100).toLowerCase().replace(/\s+/g, " ").trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function truncateContent(content: string, maxLength: number): { content: string; wasTruncated: boolean } {
  if (content.length <= maxLength) return { content, wasTruncated: false };
  const truncated = content.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return { content: lastSpace > maxLength * 0.8 ? truncated.slice(0, lastSpace) + "..." : truncated + "...", wasTruncated: true };
}

export const importOpenAPI = new OpenAPIHono();
importOpenAPI.use("*", authMiddleware);

// Handle all requests manually (bypass OpenAPI validation for both JSON and multipart)
// OpenAPI validation doesn't properly parse multipart form data
importOpenAPI.post("/", async (c) => {
  const contentType = c.req.header("Content-Type") || "";
  const user = c.get("user");
  const userId = user.userId;

  // Handle JSON requests (from KOReader plugin)
  if (contentType.includes("application/json")) {
    try {
      const jsonBody = await c.req.json();
      console.log("[Import JSON] Received:", JSON.stringify(jsonBody).slice(0, 300));

      const source = jsonBody.source;
      if (!source || (source !== "koreader" && source !== "kindle")) {
        return c.json({ error: `Unsupported source: ${source}` }, 400);
      }

      const data = jsonBody.data;
      if (!data) {
        return c.json({ error: "No data provided" }, 400);
      }

      // Parse highlights from the data
      const highlights: Array<{content: string; note?: string; chapter?: string; page?: number; highlightedAt?: Date}> = [];

      // Debug: log the data structure
      console.log("[Import JSON] Data keys:", Object.keys(data));
      console.log("[Import JSON] entries type:", typeof data.entries, "isArray:", Array.isArray(data.entries));
      if (data.entries) {
        console.log("[Import JSON] entries length/keys:", Array.isArray(data.entries) ? data.entries.length : Object.keys(data.entries).length);
        // Log first entry structure
        const entriesArray = Array.isArray(data.entries) ? data.entries : Object.values(data.entries);
        if (entriesArray.length > 0) {
          console.log("[Import JSON] First entry keys:", Object.keys(entriesArray[0] as object));
          console.log("[Import JSON] First entry:", JSON.stringify(entriesArray[0]).slice(0, 200));
        }
      }

      // Handle entries (can be array or object from Lua)
      const entries = data.entries;
      if (entries) {
        const entriesArray = Array.isArray(entries) ? entries : Object.values(entries);
        for (const entry of entriesArray) {
          if (entry && (entry as any).text) {
            highlights.push({
              content: (entry as any).text,
              note: (entry as any).notes,
              chapter: (entry as any).chapter,
              page: (entry as any).page,
              highlightedAt: (entry as any).datetime ? new Date((entry as any).datetime) : undefined,
            });
          }
        }
      }

      // Handle bookmarks array
      const bookmarks = data.bookmarks;
      if (bookmarks) {
        const bookmarksArray = Array.isArray(bookmarks) ? bookmarks : Object.values(bookmarks);
        for (const b of bookmarksArray) {
          if (b && (b as any).text) {
            highlights.push({
              content: (b as any).text,
              note: (b as any).notes,
              chapter: (b as any).chapter,
              page: (b as any).page,
              highlightedAt: (b as any).datetime ? new Date((b as any).datetime) : undefined,
            });
          }
        }
      }

      console.log(`[Import JSON] Parsed ${highlights.length} highlights for "${data.title}"`);

      // Now process the import
      const [syncRecord] = await db.insert(syncHistory).values({
        userId,
        sourceType: source as SourceType,
        status: "in_progress"
      }).returning();

      // Find or create book - prefer md5sum matching, fall back to title
      let bookId: string;
      let existingBook = null;

      // First try to find by md5sum (file content hash) if provided
      if (data.md5sum) {
        const booksWithMd5 = await db.select().from(books)
          .where(eq(books.userId, userId));
        existingBook = booksWithMd5.find(b =>
          (b.metadata as any)?.md5sum === data.md5sum
        ) || null;
      }

      // Fall back to title matching
      if (!existingBook) {
        [existingBook] = await db.select().from(books)
          .where(and(eq(books.userId, userId), eq(books.title, data.title || "Untitled")))
          .limit(1);
      }

      if (existingBook) {
        bookId = existingBook.id;
        // Update md5sum in metadata if not present
        if (data.md5sum && !(existingBook.metadata as any)?.md5sum) {
          await db.update(books).set({
            metadata: { ...(existingBook.metadata as object || {}), md5sum: data.md5sum }
          }).where(eq(books.id, bookId));
        }
      } else {
        const [newBook] = await db.insert(books).values({
          userId,
          title: data.title || "Untitled",
          author: data.author || data.authors || null,
          sourceType: source as SourceType,
          metadata: data.md5sum ? { md5sum: data.md5sum } : null,
        }).returning();
        bookId = newBook.id;

        // Queue metadata fetch from Hardcover for new books
        if (metadataService.hasProviders()) {
          metadataQueue.add({
            bookId,
            title: data.title || "Untitled",
            author: data.author || data.authors || null
          });
          console.log("[Import JSON] Queued metadata fetch for:", data.title);
        }
      }

      // Get existing highlights for this book to check for duplicates (using content hash)
      const existingHighlights = await db.select({
        id: highlightsTable.id,
        content: highlightsTable.content,
        page: highlightsTable.page,
        chapter: highlightsTable.chapter,
        deletedAt: highlightsTable.deletedAt,
      })
        .from(highlightsTable)
        .where(eq(highlightsTable.bookId, bookId));

      // Map hash to existing highlight for updates
      const existingByHash = new Map(existingHighlights.map(h => [generateContentHash(h.content), h]));

      // Insert highlights
      let highlightsImported = 0;
      let highlightsSkipped = 0;
      let highlightsUpdated = 0;
      let highlightsResurrected = 0;
      for (const h of highlights) {
        // Check for duplicate by content hash
        const contentHash = generateContentHash(h.content);
        const existing = existingByHash.get(contentHash);

        if (existing) {
          // Check if soft-deleted - implement resurrection logic
          if (existing.deletedAt) {
            const deviceTime = h.highlightedAt ? new Date(h.highlightedAt) : null;
            const deletedTime = new Date(existing.deletedAt);

            // Only resurrect if the device timestamp is AFTER deletion
            if (deviceTime && deviceTime > deletedTime) {
              await db.update(highlightsTable).set({
                deletedAt: null, // Restore
                syncedAt: new Date(),
              }).where(eq(highlightsTable.id, existing.id));
              highlightsResurrected++;
              console.log("[Import JSON] Resurrected highlight:", h.content.slice(0, 40));
            } else {
              highlightsSkipped++;
              console.log("[Import JSON] Skipped deleted highlight:", h.content.slice(0, 40));
            }
            continue;
          }

          // Check if we can update missing page/chapter info
          const newPage = typeof h.page === 'number' ? h.page : (parseInt(String(h.page)) || null);
          const needsUpdate = (newPage && !existing.page) || (h.chapter && !existing.chapter);

          if (needsUpdate) {
            await db.update(highlightsTable).set({
              page: existing.page || newPage,
              chapter: existing.chapter || h.chapter || null,
            }).where(eq(highlightsTable.id, existing.id));
            highlightsUpdated++;
            console.log("[Import JSON] Updated missing info for:", h.content.slice(0, 40));
          } else {
            highlightsSkipped++;
          }
          continue;
        }

        try {
          await db.insert(highlightsTable).values({
            bookId,
            userId,
            content: h.content,
            contentHash, // Store the content hash
            note: h.note || null,
            chapter: h.chapter || null,
            // Page can be a number or XPath string in KOReader - only use if it's a number
            page: typeof h.page === 'number' ? h.page : (parseInt(String(h.page)) || null),
            highlightedAt: h.highlightedAt || null,
          });
          highlightsImported++;
          existingByHash.set(contentHash, { id: '', content: h.content, page: null, chapter: null, deletedAt: null }); // Prevent duplicates within same import
          console.log("[Import JSON] Inserted highlight:", h.content.slice(0, 50));
        } catch (e: any) {
          // Log actual error
          const errorMessage = e?.message || String(e);
          if (errorMessage.includes("duplicate") || errorMessage.includes("unique")) {
            highlightsSkipped++;
          } else {
            console.error("[Import JSON] Error inserting highlight:", errorMessage);
          }
        }
      }

      console.log(`[Import JSON] Imported ${highlightsImported}, updated ${highlightsUpdated}, skipped ${highlightsSkipped} duplicates`);

      await db.update(syncHistory).set({
        status: "completed",
        itemsProcessed: highlightsImported,
        completedAt: new Date(),
      }).where(eq(syncHistory.id, syncRecord.id));

      return c.json({
        source,
        booksImported: existingBook ? 0 : 1,
        highlightsImported,
        highlightsSkipped: highlights.length - highlightsImported,
        syncHistoryId: syncRecord.id,
      }, 201);

    } catch (error) {
      console.error("[Import JSON] Error:", error);
      return c.json({ error: "Import failed", details: String(error) }, 500);
    }
  }

  // Handle multipart/form-data (from web UI file upload)
  if (contentType.includes("multipart/form-data")) {
    try {
      const body = await c.req.parseBody();
      const file = body["file"];
      const source = body["source"] as string;

      console.log("[Import Multipart] Received source:", source, "file:", file instanceof File ? file.name : "N/A");

      if (!file || !(file instanceof File)) {
        return c.json({ error: "No file provided" }, 400);
      }

      if (!source || !importers[source]) {
        return c.json({ error: `Unsupported import source: ${source}. Supported: ${Object.keys(importers).join(", ")}` }, 400);
      }

      const importer = importers[source];
      const isValid = await importer.validate(file);
      if (!isValid) {
        return c.json({ error: `Invalid file format for ${source}` }, 400);
      }

      const parsedBooks = await importer.parse(file);

      const [syncRecord] = await db.insert(syncHistory).values({
        userId,
        sourceType: source as SourceType,
        status: "in_progress"
      }).returning();

      const maxHighlightLength = parseInt(await getSetting("max_highlight_length"), 10) || 5000;

      let totalBooksImported = 0, totalHighlightsImported = 0, totalHighlightsSkipped = 0, totalHighlightsTruncated = 0;
      const bookBreakdown: { bookId: string; title: string; highlightCount: number }[] = [];

      for (const parsedBook of parsedBooks) {
        let existingBook = null;

        if (parsedBook.externalId) {
          const [found] = await db.select().from(books)
            .where(and(eq(books.userId, userId), eq(books.externalId, parsedBook.externalId))).limit(1);
          existingBook = found;
        }

        if (!existingBook && parsedBook.title) {
          const [found] = await db.select().from(books)
            .where(and(eq(books.userId, userId), eq(books.title, parsedBook.title))).limit(1);
          existingBook = found;
        }

        let bookId: string;

        if (existingBook) {
          bookId = existingBook.id;
          if (metadataService.hasProviders()) {
            metadataQueue.add({ bookId: existingBook.id, title: parsedBook.title, author: parsedBook.author });
          }
        } else {
          const [insertedBook] = await db.insert(books).values({
            userId,
            title: parsedBook.title,
            author: parsedBook.author || null,
            sourceType: source as SourceType,
            externalId: parsedBook.externalId,
            metadata: parsedBook.metadata || {},
          }).returning();
          bookId = insertedBook.id;
          totalBooksImported++;
          if (metadataService.hasProviders()) {
            metadataQueue.add({ bookId, title: parsedBook.title, author: parsedBook.author });
          }
        }

        const existingHighlights = await db.select({ content: highlightsTable.content, originalContent: highlightsTable.originalContent, deletedAt: highlightsTable.deletedAt })
          .from(highlightsTable).where(eq(highlightsTable.bookId, bookId));
        // Include soft-deleted items in hash check - we don't want to re-create them as new
        const existingHashes = new Set(existingHighlights.map(h => generateContentHash(h.originalContent || h.content)));

        const newHighlights = parsedBook.highlights.filter(h => {
          const hash = generateContentHash(h.content);
          if (existingHashes.has(hash)) { totalHighlightsSkipped++; return false; }
          existingHashes.add(hash);
          return true;
        });

        if (newHighlights.length > 0) {
          const highlightValues = newHighlights.map(h => {
            const { content: truncatedContent, wasTruncated } = truncateContent(h.content, maxHighlightLength);
            if (wasTruncated) totalHighlightsTruncated++;
            return {
              bookId, userId, content: truncatedContent, originalContent: h.content,
              contentHash: generateContentHash(h.content), // Store content hash
              note: h.note || null, chapter: h.chapter || null, page: h.page || null,
              positionPercent: h.positionPercent || null,
              highlightedAt: h.highlightedAt ? new Date(h.highlightedAt) : null,
            };
          });

          const insertedHighlights = await db.insert(highlightsTable).values(highlightValues).returning({ id: highlightsTable.id, content: highlightsTable.content });
          totalHighlightsImported += insertedHighlights.length;

          const existingBreakdown = bookBreakdown.find(b => b.bookId === bookId);
          if (existingBreakdown) existingBreakdown.highlightCount += newHighlights.length;
          else bookBreakdown.push({ bookId, title: parsedBook.title, highlightCount: newHighlights.length });

          embeddingQueue.addBatch(insertedHighlights.map(h => ({ highlightId: h.id, content: h.content })));
        }
      }

      await db.update(syncHistory).set({
        status: "completed", itemsProcessed: totalHighlightsImported,
        itemsTotal: totalHighlightsImported + totalHighlightsSkipped, completedAt: new Date(),
      }).where(eq(syncHistory.id, syncRecord.id));

      return c.json({
        source, booksImported: totalBooksImported, highlightsImported: totalHighlightsImported,
        highlightsSkipped: totalHighlightsSkipped, highlightsTruncated: totalHighlightsTruncated || undefined,
        syncHistoryId: syncRecord.id,
        bookBreakdown: bookBreakdown.length > 0 ? bookBreakdown : undefined,
      }, 201);

    } catch (error) {
      console.error("[Import Multipart] Error:", error);
      return c.json({ error: "Import failed", details: error instanceof Error ? error.message : String(error) }, 500);
    }
  }

  // Unsupported content type
  return c.json({ error: `Unsupported Content-Type: ${contentType}. Use application/json or multipart/form-data` }, 400);
});


// POST / - Import highlights (multipart form data, OpenAPI)
importOpenAPI.openapi(importRoute, async (c) => {
  try {
    const user = c.get("user");
    const userId = user.userId;

    const contentType = c.req.header("Content-Type") || "";
    let source: SourceType;
    let parsedBooks: Awaited<ReturnType<BaseImporter["parse"]>>;

    // Handle JSON body (from KOReader plugin)
    if (contentType.includes("application/json")) {
      const jsonBody = await c.req.json();
      console.log("[Import] Received JSON body:", JSON.stringify(jsonBody).slice(0, 500));
      source = jsonBody.source as SourceType;

      if (!source || !importers[source]) {
        return c.json({ error: `Unsupported import source: ${source}` }, 400);
      }

      // If data is provided directly from KOReader plugin, process it directly
      if (jsonBody.data) {
        const data = jsonBody.data;
        // Convert plugin format to ParsedBook format
        const highlights = [];

        // Handle entries array from plugin
        // Note: Lua JSON encodes empty tables as {} (object), not [] (array)
        const entries = data.entries;
        if (entries) {
          const entriesArray = Array.isArray(entries) ? entries : Object.values(entries);
          for (const entry of entriesArray) {
            if (entry && entry.text) {
              highlights.push({
                content: entry.text,
                note: entry.notes,
                chapter: entry.chapter,
                page: entry.page,
                highlightedAt: entry.datetime ? new Date(entry.datetime) : (entry.time ? new Date(entry.time * 1000) : undefined),
              });
            }
          }
        }

        // Handle bookmarks array (alternative format)
        if (data.bookmarks && Array.isArray(data.bookmarks)) {
          for (const b of data.bookmarks) {
            if (b.text) {
              highlights.push({
                content: b.text,
                note: b.notes,
                chapter: b.chapter,
                page: b.page,
                highlightedAt: b.datetime ? new Date(b.datetime) : undefined,
              });
            }
          }
        }

        parsedBooks = [{
          title: data.title || "Untitled",
          author: data.author || data.authors,
          externalId: data.md5sum || data.file || data.doc_path,
          highlights,
        }];

        console.log(`[Import] Parsed ${highlights.length} highlights for "${data.title}"`);
      } else {
        return c.json({ error: "No data provided in JSON body" }, 400);
      }
    }
    // Handle multipart form data (file upload from web UI)
    else {
      const body = await c.req.parseBody();
      const file = body["file"];
      source = body["source"] as SourceType;

      if (!file || !(file instanceof File)) {
        return c.json({ error: "No file provided" }, 400);
      }

      const importer = importers[source];
      if (!importer) {
        return c.json({ error: `Unsupported import source: ${source}` }, 400);
      }

      const isValid = await importer.validate(file);
      if (!isValid) {
        return c.json({ error: `Invalid file format for ${source}` }, 400);
      }

      parsedBooks = await importer.parse(file);
    }

    const [syncRecord] = await db.insert(syncHistory).values({ userId, sourceType: source, status: "in_progress" }).returning();

    try {
      const maxHighlightLength = parseInt(await getSetting("max_highlight_length"), 10) || 5000;

      let totalBooksImported = 0, totalHighlightsImported = 0, totalHighlightsSkipped = 0, totalHighlightsTruncated = 0;
      const allPendingUpdates: PendingMetadataUpdate[] = [];
      const bookBreakdown: { bookId: string; title: string; highlightCount: number }[] = [];

      for (const parsedBook of parsedBooks) {
        let existingBook = null;

        if (parsedBook.externalId) {
          const [found] = await db.select().from(books)
            .where(and(eq(books.userId, userId), eq(books.externalId, parsedBook.externalId))).limit(1);
          existingBook = found;
        }

        if (!existingBook && parsedBook.title) {
          const [found] = await db.select().from(books)
            .where(and(eq(books.userId, userId), eq(books.title, parsedBook.title))).limit(1);
          existingBook = found;
        }

        let bookId: string;
        const bookPendingUpdates: PendingMetadataUpdate[] = [];

        if (existingBook) {
          bookId = existingBook.id;
          if (metadataService.hasProviders()) {
            metadataQueue.add({ bookId: existingBook.id, title: parsedBook.title, author: parsedBook.author });
          }
        } else {
          const [insertedBook] = await db.insert(books).values({
            userId,
            title: parsedBook.title,
            author: parsedBook.author || null,
            sourceType: source,
            externalId: parsedBook.externalId,
            metadata: parsedBook.metadata || {},
          }).returning();
          bookId = insertedBook.id;
          totalBooksImported++;
          if (metadataService.hasProviders()) {
            metadataQueue.add({ bookId, title: parsedBook.title, author: parsedBook.author });
          }
        }

        const existingHighlights = await db.select({ content: highlightsTable.content, originalContent: highlightsTable.originalContent, deletedAt: highlightsTable.deletedAt })
          .from(highlightsTable).where(eq(highlightsTable.bookId, bookId));
        // Include soft-deleted items in hash check - we don't want to re-create them as new
        const existingHashes = new Set(existingHighlights.map(h => generateContentHash(h.originalContent || h.content)));

        const newHighlights = parsedBook.highlights.filter(h => {
          const hash = generateContentHash(h.content);
          if (existingHashes.has(hash)) { totalHighlightsSkipped++; return false; }
          existingHashes.add(hash);
          return true;
        });

        if (newHighlights.length > 0) {
          const highlightValues = newHighlights.map(h => {
            const { content: truncatedContent, wasTruncated } = truncateContent(h.content, maxHighlightLength);
            if (wasTruncated) totalHighlightsTruncated++;
            return {
              bookId, userId, content: truncatedContent, originalContent: h.content,
              contentHash: generateContentHash(h.content), // Store content hash
              note: h.note || null, chapter: h.chapter || null, page: h.page || null,
              positionPercent: h.positionPercent || null,
              highlightedAt: h.highlightedAt ? new Date(h.highlightedAt) : null,
            };
          });

          const insertedHighlights = await db.insert(highlightsTable).values(highlightValues).returning({ id: highlightsTable.id, content: highlightsTable.content });
          totalHighlightsImported += insertedHighlights.length;

          const existingBreakdown = bookBreakdown.find(b => b.bookId === bookId);
          if (existingBreakdown) existingBreakdown.highlightCount += newHighlights.length;
          else bookBreakdown.push({ bookId, title: parsedBook.title, highlightCount: newHighlights.length });

          embeddingQueue.addBatch(insertedHighlights.map(h => ({ highlightId: h.id, content: h.content })));
        }

        allPendingUpdates.push(...bookPendingUpdates);
      }

      await db.update(syncHistory).set({
        status: "completed", itemsProcessed: totalHighlightsImported,
        itemsTotal: totalHighlightsImported + totalHighlightsSkipped, completedAt: new Date(),
      }).where(eq(syncHistory.id, syncRecord.id));

      return c.json({
        source, booksImported: totalBooksImported, highlightsImported: totalHighlightsImported,
        highlightsSkipped: totalHighlightsSkipped, highlightsTruncated: totalHighlightsTruncated || undefined,
        syncHistoryId: syncRecord.id,
        pendingUpdates: allPendingUpdates.length > 0 ? allPendingUpdates : undefined,
        bookBreakdown: bookBreakdown.length > 0 ? bookBreakdown : undefined,
      }, 201);
    } catch (parseError) {
      await db.update(syncHistory).set({
        status: "failed", errorMessage: parseError instanceof Error ? parseError.message : "Unknown error", completedAt: new Date(),
      }).where(eq(syncHistory.id, syncRecord.id));
      throw parseError;
    }
  } catch (error) {
    console.error("Import error:", error);
    return c.json({ error: "Import failed", details: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// POST /manual - Manually add a highlight
importOpenAPI.post("/manual", async (c) => {
  try {
    const user = c.get("user");
    const userId = user.userId;

    const body = await c.req.json();

    // Validate required fields
    const { title, content } = body;
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return c.json({ error: "Book title is required" }, 400);
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return c.json({ error: "Highlight content is required" }, 400);
    }

    // Optional fields
    const author = body.author?.trim() || null;
    const note = body.note?.trim() || null;
    const chapter = body.chapter?.trim() || null;

    // Parse location: can be a number, "1,251", or range "1,251-1,252"
    // Extract first number and remove commas
    let page: number | null = null;
    if (body.location) {
      const locationStr = String(body.location).replace(/,/g, '');
      const firstNum = locationStr.match(/\d+/);
      if (firstNum) page = parseInt(firstNum[0], 10);
    } else if (body.page) {
      page = parseInt(body.page, 10);
    }

    const sourceUrl = body.sourceUrl?.trim() || null;
    let coverImageUrl = body.coverImageUrl?.trim() || null;
    const color = body.color?.trim() || null; // Store for future use
    const source = body.source?.trim() || 'manual'; // Default to 'manual' if not provided
    const providedBookId = body.bookId?.trim() || null;

    // If coverImageUrl is a remote URL (like Google favicon), download it
    // We need a temporary ID for new books, so we'll handle this after book creation
    const isRemoteCover = coverImageUrl && (
      coverImageUrl.startsWith('http://') ||
      coverImageUrl.startsWith('https://')
    );

    let bookId: string;
    let bookCreated = false;

    // If bookId provided, use that existing book
    if (providedBookId) {
      const [existingBook] = await db.select().from(books)
        .where(and(eq(books.id, providedBookId), eq(books.userId, userId)))
        .limit(1);

      if (!existingBook) {
        return c.json({ error: "Book not found" }, 404);
      }
      bookId = existingBook.id;
    } else {
      // Find by title (case sensitive for now)
      // First try to find by exact title match
      let existingBook = await db.query.books.findFirst({
        where: and(
          eq(books.userId, userId),
          eq(books.title, title.trim())
        )
      });

      if (existingBook) {
        bookId = existingBook.id;
        // Update author if provided and book doesn't have one
        // Also update coverImageUrl if book doesn't have one
        const updates: { author?: string | null; coverImageUrl?: string | null } = {};
        if (author && !existingBook.author) {
          updates.author = author;
        }
        if (coverImageUrl && !existingBook.coverImageUrl) {
          updates.coverImageUrl = coverImageUrl;
        }
        if (Object.keys(updates).length > 0) {
          await db.update(books)
            .set(updates)
            .where(eq(books.id, bookId));
        }
      } else {
        // Create new book - first without cover, then download and update
        const [newBook] = await db.insert(books).values({
          userId,
          title: title.trim(),
          author,
          sourceType: source as any,
        }).returning();
        bookId = newBook.id;
        bookCreated = true;

        // Download cover image if it's a remote URL
        if (isRemoteCover && coverImageUrl) {
          // Check if this is a favicon from Google's service
          const isFavicon = coverImageUrl.includes('favicon') || coverImageUrl.includes('google.com/s2/favicons');
          const bookIdWithSuffix = isFavicon ? `${bookId}_favicon` : bookId;

          console.log(`📸 Downloading cover image for book ${bookId}: ${coverImageUrl} (favicon: ${isFavicon})`);
          const localCoverUrl = await downloadCover(coverImageUrl, bookIdWithSuffix);
          if (localCoverUrl) {
            coverImageUrl = localCoverUrl;
            await db.update(books)
              .set({ coverImageUrl: localCoverUrl })
              .where(eq(books.id, bookId));
            console.log(`📸 Cover saved locally: ${localCoverUrl}`);
          } else {
            console.warn(`⚠️ Failed to download cover, keeping remote URL`);
            // Keep the remote URL as fallback
            await db.update(books)
              .set({ coverImageUrl })
              .where(eq(books.id, bookId));
          }
        } else if (coverImageUrl) {
          // Local cover URL, just save it
          await db.update(books)
            .set({ coverImageUrl })
            .where(eq(books.id, bookId));
        }

        // Queue metadata fetch (skip if we already have a cover)
        if (!coverImageUrl) {
          metadataQueue.add({
            bookId,
            title: title.trim(),
            author,
          });
        }

        // Track book import
        const stats = await telemetryService.getTelemetryStats();
        await telemetryService.track("book_imported", {
          source: "manual",
          bookId,
          hasCover: !!coverImageUrl,
          ...stats
        });
      }
    }

    // Check for duplicate highlight
    const contentHash = generateContentHash(content.trim());
    const existingHighlights = await db.select({ content: highlightsTable.content })
      .from(highlightsTable)
      .where(eq(highlightsTable.bookId, bookId));

    const existingHashes = new Set(existingHighlights.map(h => generateContentHash(h.content)));

    if (existingHashes.has(contentHash)) {
      return c.json({ error: "This highlight already exists for this book" }, 409);
    }

    // Insert the highlight
    const [newHighlight] = await db.insert(highlightsTable).values({
      bookId,
      userId,
      content: content.trim(),
      note,
      chapter,
      page,
      sourceUrl,
      highlightedAt: new Date(),
      originalContent: content.trim(),
    }).returning();

    // Queue embedding generation for semantic search
    embeddingQueue.add({
      highlightId: newHighlight.id,
      content: content.trim(),
    });

    // Track highlight creation
    await telemetryService.track("highlight_created", {
      source: "manual",
      bookId,
      hasNote: !!note,
    });

    return c.json({
      message: "Highlight added successfully",
      bookId,
      bookCreated,
      highlightId: newHighlight.id,
    }, 201);

  } catch (error) {
    console.error("[Manual Import] Error:", error);
    return c.json({ error: "Failed to add highlight", details: String(error) }, 500);
  }
});

// POST /kindle - Import highlights from Kindle sync (supports single and batch)
// Single: { title, author, content, note?, location?, color? }
// Batch: { books: [{ title, author, highlights: [{ content, note?, location?, color? }] }] }
importOpenAPI.post("/kindle", async (c) => {
  try {
    const user = c.get("user");
    const userId = user.userId;

    const body = await c.req.json();

    // Determine if single or batch format
    const isBatch = Array.isArray(body.books);

    // Normalize to batch format
    interface KindleHighlight {
      content: string;
      note?: string;
      location?: string;
      color?: string;
    }
    interface KindleBook {
      title: string;
      author?: string;
      highlights: KindleHighlight[];
    }

    let booksToProcess: KindleBook[];

    if (isBatch) {
      booksToProcess = body.books;
    } else {
      // Single highlight format - wrap in batch structure
      const { title, author, content, note, location, color } = body;

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return c.json({ error: "Book title is required" }, 400);
      }
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return c.json({ error: "Highlight content is required" }, 400);
      }

      booksToProcess = [{
        title: title.trim(),
        author: author?.trim() || undefined,
        highlights: [{ content: content.trim(), note, location, color }]
      }];
    }

    let totalBooksCreated = 0;
    let totalHighlightsImported = 0;
    let totalHighlightsSkipped = 0;
    const results: { bookId: string; title: string; highlightsImported: number; highlightsSkipped: number }[] = [];

    for (const bookData of booksToProcess) {
      if (!bookData.title || !bookData.highlights || bookData.highlights.length === 0) {
        continue;
      }

      const title = bookData.title.trim();
      const author = bookData.author?.trim() || null;

      // Find or create book
      let bookId: string;
      let bookCreated = false;

      let [existingBook] = await db.select().from(books)
        .where(and(
          eq(books.userId, userId),
          eq(books.title, title)
        ))
        .limit(1);

      if (existingBook) {
        bookId = existingBook.id;
        // Update author if provided and book doesn't have one
        if (author && !existingBook.author) {
          await db.update(books)
            .set({ author })
            .where(eq(books.id, bookId));
        }
      } else {
        // Create new book with 'kindle' source
        const [newBook] = await db.insert(books).values({
          userId,
          title,
          author,
          sourceType: "kindle",
        }).returning();
        bookId = newBook.id;
        bookCreated = true;
        totalBooksCreated++;

        // Queue metadata fetch
        metadataQueue.add({ bookId, title, author: author || undefined });
      }

      // Get existing highlights for deduplication
      const existingHighlights = await db.select({ content: highlightsTable.content })
        .from(highlightsTable)
        .where(eq(highlightsTable.bookId, bookId));

      const existingHashes = new Set(existingHighlights.map(h => generateContentHash(h.content)));

      let bookHighlightsImported = 0;
      let bookHighlightsSkipped = 0;

      for (const h of bookData.highlights) {
        if (!h.content || h.content.trim().length === 0) continue;

        const content = h.content.trim();
        const contentHash = generateContentHash(content);

        // Skip duplicates
        if (existingHashes.has(contentHash)) {
          bookHighlightsSkipped++;
          totalHighlightsSkipped++;
          continue;
        }
        existingHashes.add(contentHash);

        // Parse location (can be "1,251" or "1,251-1,252")
        let page: number | null = null;
        if (h.location) {
          const locationStr = String(h.location).replace(/,/g, '');
          const firstNum = locationStr.match(/\d+/);
          if (firstNum) page = parseInt(firstNum[0], 10);
        }

        // Insert highlight and get the ID
        const [insertedHighlight] = await db.insert(highlightsTable).values({
          bookId,
          userId,
          content,
          note: h.note?.trim() || null,
          page,
          highlightedAt: new Date(),
          originalContent: content,
        }).returning({ id: highlightsTable.id, content: highlightsTable.content });

        // Queue embedding generation for this highlight
        embeddingQueue.add({
          highlightId: insertedHighlight.id,
          content: insertedHighlight.content,
        });

        bookHighlightsImported++;
        totalHighlightsImported++;
      }

      results.push({
        bookId,
        title,
        highlightsImported: bookHighlightsImported,
        highlightsSkipped: bookHighlightsSkipped,
      });
    }

    // Track batch import
    if (totalBooksCreated > 0 || totalHighlightsImported > 0) {
      const stats = await telemetryService.getTelemetryStats();
      await telemetryService.track("batch_import_completed", {
        source: "kindle", // or generic
        booksCreated: totalBooksCreated,
        highlightsImported: totalHighlightsImported,
        highlightsSkipped: totalHighlightsSkipped,
        ...stats
      });
    }

    return c.json({
      message: "Kindle sync completed",
      booksCreated: totalBooksCreated,
      highlightsImported: totalHighlightsImported,
      highlightsSkipped: totalHighlightsSkipped,
      books: results,
    }, 201);

  } catch (error) {
    console.error("[Kindle Import] Error:", error);
    return c.json({ error: "Failed to import Kindle highlights", details: String(error) }, 500);
  }
});
