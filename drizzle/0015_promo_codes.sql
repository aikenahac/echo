-- Promo codes that grant a plan for a fixed time without payment.
-- Idempotent: safe to run more than once.
ALTER TYPE "subscription_source" ADD VALUE IF NOT EXISTS 'promo';
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "promo_duration_unit" AS ENUM ('month', 'year', 'lifetime');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promo_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "plan_id" uuid NOT NULL REFERENCES "subscription_plans"("id"),
  "duration_unit" "promo_duration_unit" NOT NULL,
  "duration_count" integer,
  "max_uses" integer,
  "redeemed_count" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "note" text,
  "created_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promo_redemptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code_id" uuid NOT NULL REFERENCES "promo_codes"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "redeemed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "promo_redemptions_code_user_idx" ON "promo_redemptions" ("code_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promo_redemptions_user_idx" ON "promo_redemptions" ("user_id");
