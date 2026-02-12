-- Add digest preference columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "digest_frequency" text DEFAULT 'daily';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "digest_hour" integer DEFAULT 8;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "digest_timezone" text DEFAULT 'UTC';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_digest_sent_at" timestamp with time zone;
