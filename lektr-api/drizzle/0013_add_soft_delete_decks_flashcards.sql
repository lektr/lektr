ALTER TABLE "decks" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "deleted_at" timestamp with time zone;
