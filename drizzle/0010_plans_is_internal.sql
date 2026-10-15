-- subscription_plans.is_internal was added to the schema without a migration.
-- Idempotent: safe to run more than once.
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "is_internal" boolean DEFAULT false NOT NULL;
