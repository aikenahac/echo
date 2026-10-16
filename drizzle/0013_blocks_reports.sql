-- User blocks and reports of users/reviews.
-- Idempotent: safe to run more than once.
CREATE TABLE IF NOT EXISTS "blocks" (
  "blocker_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "blocked_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("blocker_id", "blocked_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blocks_blocked_idx" ON "blocks" ("blocked_id");
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "report_target_type" AS ENUM ('user', 'review');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "report_reason" AS ENUM ('spam', 'harassment', 'hate', 'inappropriate', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "report_status" AS ENUM ('open', 'resolved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reporter_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "target_type" "report_target_type" NOT NULL,
  "target_id" text NOT NULL,
  "target_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reason" "report_reason" NOT NULL,
  "details" text,
  "content_snapshot" text,
  "status" "report_status" DEFAULT 'open' NOT NULL,
  "resolution_note" text,
  "resolved_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reports_reporter_target_idx" ON "reports" ("reporter_id", "target_type", "target_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_status_created_at_idx" ON "reports" ("status", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_target_user_idx" ON "reports" ("target_user_id");
