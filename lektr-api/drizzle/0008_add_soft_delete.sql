ALTER TABLE "highlights" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "highlights" ADD COLUMN "deleted_at" timestamp with time zone;