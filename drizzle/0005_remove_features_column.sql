-- Drop the features column from subscription_plans table
-- Idempotent: safe to run more than once.
ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "features";
