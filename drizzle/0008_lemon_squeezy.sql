-- Move web payments from Stripe to Lemon Squeezy (merchant of record).
-- Idempotent: safe to run more than once.
-- Stripe IDs are meaningless to Lemon Squeezy, so they are cleared, not copied.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'stripe_price_id') THEN
    ALTER TABLE "subscription_plans" RENAME COLUMN "stripe_price_id" TO "ls_variant_id";
    UPDATE "subscription_plans" SET "ls_variant_id" = NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'stripe_product_id') THEN
    ALTER TABLE "subscription_plans" RENAME COLUMN "stripe_product_id" TO "ls_product_id";
    UPDATE "subscription_plans" SET "ls_product_id" = NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE "user_subscriptions" RENAME COLUMN "stripe_subscription_id" TO "ls_subscription_id";
    UPDATE "user_subscriptions" SET "ls_subscription_id" = NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE "user_subscriptions" RENAME COLUMN "stripe_customer_id" TO "ls_customer_id";
    UPDATE "user_subscriptions" SET "ls_customer_id" = NULL;
  END IF;

  -- Keep constraint and index names in line with what drizzle would generate
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_stripe_price_id_unique') THEN
    ALTER TABLE "subscription_plans" RENAME CONSTRAINT "subscription_plans_stripe_price_id_unique" TO "subscription_plans_ls_variant_id_unique";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_subscriptions_stripe_subscription_id_unique') THEN
    ALTER TABLE "user_subscriptions" RENAME CONSTRAINT "user_subscriptions_stripe_subscription_id_unique" TO "user_subscriptions_ls_subscription_id_unique";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_subscriptions_stripe_customer_idx') THEN
    ALTER INDEX "user_subscriptions_stripe_customer_idx" RENAME TO "user_subscriptions_ls_customer_idx";
  END IF;

  -- Webhook idempotency: events are keyed by a hash of the body, so old Stripe IDs are dropped
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_events') THEN
    ALTER TABLE "stripe_events" RENAME TO "webhook_events";
    DELETE FROM "webhook_events";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
