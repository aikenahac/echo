import { withAuth, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { IngestInputSchema, ingestSearch } from "@/lib/catalog-search";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/v1/books/search/ingest
 * Report a page of Open Library results the client fetched itself, so they are
 * stored for everyone. Body: { query, page, numFound, docs: OpenLibraryDoc[] }.
 * Returns { ids }: Open Library work key -> catalog book id.
 */
export const POST = withAuth(async (request, { user }) => {
  if (!rateLimit(`ingest:${user.id}`, 120, 60 * 60_000)) {
    throw new ApiError("Too many requests", 429);
  }

  const parsed = IngestInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    throw new ApiError("Invalid search results");
  }

  return createApiResponse({ ids: await ingestSearch(parsed.data, user.id) });
});
