import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db";
import { books, settings } from "../db/schema";
import { eq, isNull, inArray } from "drizzle-orm";
import { metadataService } from "../services";
import { emailService } from "../services/email";
import { jobQueueService } from "../services/job-queue";
import { digestService } from "../services/digest";
import { render } from "@react-email/render";
import WelcomeEmail from "../emails/welcome";

const adminRouter = new Hono();

// All admin routes require auth
adminRouter.use("*", authMiddleware);

// Email settings keys
const EMAIL_SETTINGS_KEYS = [
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "smtp_secure",
  "mail_from_name",
  "mail_from_email",
] as const;

/**
 * GET /api/v1/admin/email-settings
 * Get current email configuration
 * Admin only
 */
adminRouter.get("/email-settings", async (c) => {
  const user = c.get("user");

  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const dbSettings = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, [...EMAIL_SETTINGS_KEYS]));

  const settingsMap: Record<string, string> = {};
  for (const s of dbSettings) {
    // Mask password
    if (s.key === "smtp_pass" && s.value) {
      settingsMap[s.key] = "••••••••";
    } else {
      settingsMap[s.key] = s.value;
    }
  }

  // Check if configured
  const isConfigured = await emailService.isConfigured();

  return c.json({
    settings: settingsMap,
    isConfigured,
    envFallback: !settingsMap.smtp_host && process.env.SMTP_HOST ? true : false,
  });
});

/**
 * PUT /api/v1/admin/email-settings
 * Update email configuration
 * Admin only
 */
adminRouter.put("/email-settings", async (c) => {
  const user = c.get("user");

  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const body = await c.req.json();

  // Validate and upsert each setting
  for (const key of EMAIL_SETTINGS_KEYS) {
    if (body[key] !== undefined) {
      // Skip if it's the masked password placeholder
      if (key === "smtp_pass" && body[key] === "••••••••") {
        continue;
      }

      await db
        .insert(settings)
        .values({
          key,
          value: String(body[key]),
          description: `Email configuration: ${key}`,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: String(body[key]),
            updatedAt: new Date(),
          },
        });
    }
  }

  return c.json({ success: true, message: "Email settings updated" });
});

/**
 * POST /api/v1/admin/email-settings/test
 * Send a test email to verify configuration
 * Admin only
 */
adminRouter.post("/email-settings/test", async (c) => {
  const user = c.get("user");

  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const body = await c.req.json();
  const testEmail = body.email;

  if (!testEmail) {
    return c.json({ error: "Email address required" }, 400);
  }

  // Test connection first
  const connectionTest = await emailService.testConnection();
  if (!connectionTest.success) {
    return c.json({
      success: false,
      error: `Connection failed: ${connectionTest.error}`
    }, 400);
  }

  // Render and send test email
  const appUrl = process.env.APP_URL || "http://localhost:3002";
  const html = await render(WelcomeEmail({ userEmail: testEmail, appUrl }));

  const sent = await emailService.sendEmail(
    testEmail,
    "🧪 Lektr Test Email",
    html
  );

  if (sent) {
    return c.json({ success: true, message: `Test email sent to ${testEmail}` });
  } else {
    return c.json({ success: false, error: "Failed to send email" }, 500);
  }
});

/**
 * GET /api/v1/admin/job-queue/status
 * Get job queue status
 * Admin only
 */
adminRouter.get("/job-queue/status", async (c) => {
  const user = c.get("user");

  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const status = await jobQueueService.getStatus();
  return c.json(status);
});

/**
 * POST /api/v1/admin/refresh-metadata
 * Queue metadata refresh for all books without covers
 * Admin only
 */
adminRouter.post("/refresh-metadata", async (c) => {
  const user = c.get("user");

  // Admin only
  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  // Check if metadata service has providers
  if (!metadataService.hasProviders()) {
    return c.json({
      error: "No metadata providers configured. Set HARDCOVER_API_KEY in environment."
    }, 400);
  }

  // Find all books without cover images for this user
  const booksWithoutCovers = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
    })
    .from(books)
    .where(isNull(books.coverImageUrl));

  if (booksWithoutCovers.length === 0) {
    return c.json({
      queued: 0,
      message: "All books already have covers!"
    });
  }

  // Process books in background (don't await)
  const booksToProcess = [...booksWithoutCovers];

  // Start async processing
  (async () => {
    console.log(`📚 Starting metadata refresh for ${booksToProcess.length} books...`);

    let updated = 0;
    for (const book of booksToProcess) {
      try {
        const metadata = await metadataService.enrichBook(
          book.title,
          book.author || undefined,
          book.id
        );

        if (metadata?.coverImageUrl) {
          await db
            .update(books)
            .set({
              coverImageUrl: metadata.coverImageUrl,
              metadata: {
                ...(metadata.description && { description: metadata.description }),
                ...(metadata.pageCount && { pageCount: metadata.pageCount }),
                ...(metadata.publishedDate && { publishedDate: metadata.publishedDate }),
              },
              updatedAt: new Date(),
            })
            .where(eq(books.id, book.id));

          updated++;
          console.log(`✅ Updated metadata for "${book.title}"`);
        }

        // Rate limit: wait 500ms between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Failed to update "${book.title}":`, error);
      }
    }

    console.log(`📚 Metadata refresh complete: ${updated}/${booksToProcess.length} books updated`);
  })();

  return c.json({
    queued: booksWithoutCovers.length,
    message: `Queued ${booksWithoutCovers.length} books for metadata refresh. Check server logs for progress.`
  });
});

/**
 * POST /api/v1/admin/refresh-metadata/:bookId
 * Refresh metadata for a single book
 * Requires auth (any user can refresh their own books)
 */
adminRouter.post("/refresh-metadata/:bookId", async (c) => {
  const user = c.get("user");
  const bookId = c.req.param("bookId");

  // Check if metadata service has providers
  if (!metadataService.hasProviders()) {
    return c.json({
      error: "No metadata providers configured. Set HARDCOVER_API_KEY in environment."
    }, 400);
  }

  // Find the book
  const [book] = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      userId: books.userId,
    })
    .from(books)
    .where(eq(books.id, bookId))
    .limit(1);

  if (!book) {
    return c.json({ error: "Book not found" }, 404);
  }

  // Check ownership
  if (book.userId !== user.userId) {
    return c.json({ error: "Not authorized" }, 403);
  }

  // Fetch metadata
  const metadata = await metadataService.enrichBook(
    book.title,
    book.author || undefined,
    book.id
  );

  if (!metadata?.coverImageUrl) {
    return c.json({
      success: false,
      message: "No cover found for this book"
    });
  }

  // Update the book
  await db
    .update(books)
    .set({
      coverImageUrl: metadata.coverImageUrl,
      metadata: {
        ...(metadata.description && { description: metadata.description }),
        ...(metadata.pageCount && { pageCount: metadata.pageCount }),
        ...(metadata.publishedDate && { publishedDate: metadata.publishedDate }),
      },
      updatedAt: new Date(),
    })
    .where(eq(books.id, book.id));

  return c.json({
    success: true,
    coverImageUrl: metadata.coverImageUrl,
    message: "Cover updated successfully"
  });
});

/**
 * POST /api/v1/admin/trigger-digest
 * Manually trigger digest emails for all users
 * Admin only
 */
adminRouter.post("/trigger-digest", async (c) => {
  const user = c.get("user");

  if (user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  // Check if email is configured
  const isConfigured = await emailService.isConfigured();
  if (!isConfigured) {
    return c.json({
      error: "Email is not configured. Please configure SMTP settings first."
    }, 400);
  }

  // Trigger digest generation in background
  digestService.triggerNow().catch((error) => {
    console.error("📬 [Digest] Manual trigger failed:", error);
  });

  return c.json({
    success: true,
    message: "Digest emails are being generated. Check server logs for progress."
  });
});

export { adminRouter };

