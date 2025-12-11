-- Add display_name and profile_picture_url columns to users table
ALTER TABLE "users" ADD COLUMN "display_name" text DEFAULT NULL;
ALTER TABLE "users" ADD COLUMN "profile_picture_url" text DEFAULT NULL;
