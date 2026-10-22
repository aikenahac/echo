CREATE TYPE "public"."subscription_source" AS ENUM('lemonsqueezy', 'app_store', 'play_store', 'manual');--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "source" "subscription_source" DEFAULT 'lemonsqueezy' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "store_product_id" text;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "app_store_product_id" text;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "play_store_product_id" text;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_app_store_product_id_unique" UNIQUE("app_store_product_id");--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_play_store_product_id_unique" UNIQUE("play_store_product_id");--> statement-breakpoint
UPDATE "user_subscriptions" SET "source" = 'manual' WHERE "ls_subscription_id" IS NULL;
