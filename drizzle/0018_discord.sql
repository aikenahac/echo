-- Linked Discord account for community server roles.
-- Idempotent: safe to run more than once.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "discord_user_id" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_discord_user_id_unique" ON "users" ("discord_user_id");
