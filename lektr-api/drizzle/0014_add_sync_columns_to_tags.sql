-- Add updated_at and deleted_at to tags for sync support
ALTER TABLE "tags" ADD COLUMN "updated_at" timestamp with time zone NOT NULL DEFAULT now();
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint

-- Recreate highlight_tags with UUID id and timestamps for WatermelonDB sync
-- 1. Create new table
CREATE TABLE "highlight_tags_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "highlight_id" uuid NOT NULL REFERENCES "highlights"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone,
  UNIQUE ("highlight_id", "tag_id")
);
--> statement-breakpoint
-- 2. Migrate existing data
INSERT INTO "highlight_tags_new" ("highlight_id", "tag_id")
  SELECT "highlight_id", "tag_id" FROM "highlight_tags";
--> statement-breakpoint
-- 3. Drop old table and rename
DROP TABLE "highlight_tags";
--> statement-breakpoint
ALTER TABLE "highlight_tags_new" RENAME TO "highlight_tags";
--> statement-breakpoint

-- Recreate book_tags with UUID id and timestamps for WatermelonDB sync
-- 1. Create new table
CREATE TABLE "book_tags_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "book_id" uuid NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone,
  UNIQUE ("book_id", "tag_id")
);
--> statement-breakpoint
-- 2. Migrate existing data
INSERT INTO "book_tags_new" ("book_id", "tag_id")
  SELECT "book_id", "tag_id" FROM "book_tags";
--> statement-breakpoint
-- 3. Drop old table and rename
DROP TABLE "book_tags";
--> statement-breakpoint
ALTER TABLE "book_tags_new" RENAME TO "book_tags";
