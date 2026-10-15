-- Support tickets from the public /support page.
-- Idempotent: safe to run more than once.
DO $$ BEGIN
  CREATE TYPE "support_ticket_status" AS ENUM ('open', 'in_progress', 'resolved');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "message" text NOT NULL,
  "status" "support_ticket_status" DEFAULT 'open' NOT NULL,
  "internal_note" text,
  "user_agent" text,
  "ip_hash" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "resolved_at" timestamp,
  "deleted_at" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_tickets_created_at_idx" ON "support_tickets" ("created_at");
