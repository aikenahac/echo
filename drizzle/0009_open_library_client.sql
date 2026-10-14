-- Open Library results are fetched by the clients and ingested by the server.
-- Idempotent: safe to run more than once.

ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "ol_work_key" text;
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "ol_cover_id" integer;
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "ol_verified_at" timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS "books_ol_work_key_unique"
  ON "books" ("ol_work_key");

CREATE TABLE IF NOT EXISTS "ol_search_snapshots" (
  "query" text NOT NULL,
  "page" integer NOT NULL,
  "work_keys" text[] NOT NULL,
  "num_found" integer DEFAULT 0 NOT NULL,
  "submitted_by" text,
  "fetched_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("query", "page")
);
