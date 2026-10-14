-- Add display_name and profile_picture_url columns to users table
-- Idempotent: safe to run more than once.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" text DEFAULT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_picture_url" text DEFAULT NULL;
