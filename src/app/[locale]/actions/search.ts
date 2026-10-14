"use server";

import { auth } from "@clerk/nextjs/server";
import {
  IngestInputSchema,
  ingestSearch,
  searchCatalog as searchCatalogImpl,
  type CatalogSearchResponse,
} from "@/lib/catalog-search";
import { rateLimit } from "@/lib/rate-limit";

const SEARCHES_PER_MINUTE = 60;
const INGESTS_PER_HOUR = 120;

/**
 * First step of a book search: what we already have. When Open Library's
 * results for this query aren't stored, the response says "miss" and the
 * client asks Open Library itself, then reports back with
 * `recordOpenLibrarySearch`.
 */
export async function searchCatalog(
  query: string,
  page: number,
): Promise<CatalogSearchResponse | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };
  if (typeof query !== "string") return { error: "Invalid query" };
  if (!rateLimit(`search:${userId}`, SEARCHES_PER_MINUTE, 60_000)) {
    return { error: "Too many searches" };
  }
  return searchCatalogImpl(query, Number(page));
}

/**
 * Report a page of Open Library results the client fetched, so we store the
 * books and the result list. Returns work key → our book id.
 */
export async function recordOpenLibrarySearch(
  input: unknown,
): Promise<{ ids: Record<string, string> } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };
  if (!rateLimit(`ingest:${userId}`, INGESTS_PER_HOUR, 60 * 60_000)) {
    return { error: "Too many requests" };
  }

  const parsed = IngestInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid search results" };

  try {
    return { ids: await ingestSearch(parsed.data, userId) };
  } catch (error) {
    console.error("Failed to record search results:", error);
    return { error: "Failed to record search results" };
  }
}
