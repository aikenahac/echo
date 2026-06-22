ALTER TABLE "subscription_usage" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "subscription_usage" CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "paddle_price_id" text;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "paddle_product_id" text;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "is_internal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "paddle_subscription_id" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "paddle_customer_id" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "paddle_transaction_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_picture_url" text;--> statement-breakpoint
ALTER TABLE "subscription_plans" DROP COLUMN "features";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_premium";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "premium_since";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "subscription_anniversary";--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_paddle_price_id_unique" UNIQUE("paddle_price_id");--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_paddle_subscription_id_unique" UNIQUE("paddle_subscription_id");