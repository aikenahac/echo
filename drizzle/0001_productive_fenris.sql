ALTER TABLE "user_books" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "user_books_favorite_idx" ON "user_books" USING btree ("is_favorite");