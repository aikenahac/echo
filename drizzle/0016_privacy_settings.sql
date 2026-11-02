-- Who can see a user's profile content, activity and reviews.
-- Idempotent: safe to run more than once.
DO $$ BEGIN
  CREATE TYPE "audience" AS ENUM ('public', 'followers', 'friends', 'private');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_visibility" "audience" DEFAULT 'friends' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "activity_visibility" "audience" DEFAULT 'followers' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "review_visibility" "audience" DEFAULT 'public' NOT NULL;
