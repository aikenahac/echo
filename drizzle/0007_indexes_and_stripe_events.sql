-- Index cleanup, uniqueness constraints and Stripe webhook idempotency.
-- Idempotent: safe to run more than once.

-- Trigram search for books (ilike '%query%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Processed Stripe webhook events
CREATE TABLE IF NOT EXISTS "stripe_events" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Remove duplicates before adding unique indexes ---------------------------

-- Library entries: keep the oldest entry per user + book
DELETE FROM "user_books" a
  USING "user_books" b
  WHERE a."user_id" = b."user_id"
    AND a."book_id" = b."book_id"
    AND (a."created_at", a."id") > (b."created_at", b."id");

-- Reviews: keep the most recently updated review per user + book
DELETE FROM "reviews" a
  USING "reviews" b
  WHERE a."user_id" = b."user_id"
    AND a."book_id" = b."book_id"
    AND (a."updated_at", a."id") < (b."updated_at", b."id");

-- Collection books: keep the first time a book was added to a collection
DELETE FROM "collection_books" a
  USING "collection_books" b
  WHERE a."collection_id" = b."collection_id"
    AND a."user_book_id" = b."user_book_id"
    AND (a."added_at", a."id") > (b."added_at", b."id");

-- Collection slugs: make later duplicates unique
UPDATE "collections" c
  SET "slug" = c."slug" || '-' || substr(c."id"::text, 1, 8)
  FROM (
    SELECT "id", row_number() OVER (PARTITION BY "slug" ORDER BY "created_at", "id") AS rn
    FROM "collections"
  ) d
  WHERE c."id" = d."id" AND d.rn > 1;

-- Drop indexes that duplicate unique constraints / primary keys, or are replaced
DROP INDEX IF EXISTS "users_email_idx";
DROP INDEX IF EXISTS "users_username_idx";
DROP INDEX IF EXISTS "books_isbn_idx";
DROP INDEX IF EXISTS "books_title_idx";
DROP INDEX IF EXISTS "user_books_user_id_idx";
DROP INDEX IF EXISTS "user_books_status_idx";
DROP INDEX IF EXISTS "user_books_favorite_idx";
DROP INDEX IF EXISTS "user_books_user_book_idx";
DROP INDEX IF EXISTS "reviews_user_id_idx";
DROP INDEX IF EXISTS "follows_follower_idx";
DROP INDEX IF EXISTS "user_subscriptions_user_id_idx";
DROP INDEX IF EXISTS "user_subscriptions_stripe_sub_idx";
DROP INDEX IF EXISTS "collections_user_id_idx";
DROP INDEX IF EXISTS "collections_slug_idx";
DROP INDEX IF EXISTS "collections_user_slug_idx";
DROP INDEX IF EXISTS "collections_is_public_idx";
DROP INDEX IF EXISTS "collection_books_collection_id_idx";
DROP INDEX IF EXISTS "collection_books_unique_idx";
DROP INDEX IF EXISTS "collection_follows_user_id_idx";

-- New indexes
CREATE INDEX IF NOT EXISTS "books_title_trgm_idx" ON "books" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "books_author_trgm_idx" ON "books" USING gin ("author" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "books_title_author_idx" ON "books" USING btree ("title", "author");
CREATE INDEX IF NOT EXISTS "user_books_user_status_idx" ON "user_books" USING btree ("user_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "user_books_user_book_idx" ON "user_books" USING btree ("user_id", "book_id");
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_user_book_idx" ON "reviews" USING btree ("user_id", "book_id");
CREATE INDEX IF NOT EXISTS "user_subscriptions_stripe_customer_idx" ON "user_subscriptions" USING btree ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "collections_user_sort_idx" ON "collections" USING btree ("user_id", "sort_order");
CREATE UNIQUE INDEX IF NOT EXISTS "collections_slug_idx" ON "collections" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "collections_public_created_idx" ON "collections" USING btree ("created_at" DESC) WHERE "is_public";
CREATE UNIQUE INDEX IF NOT EXISTS "collection_books_unique_idx" ON "collection_books" USING btree ("collection_id", "user_book_id");
