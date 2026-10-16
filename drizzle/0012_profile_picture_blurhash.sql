-- Blurhash of the profile picture, shown while the photo loads.
-- Idempotent: safe to run more than once.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_picture_blurhash" text;
