import { withAuth, ApiError, parseIntParam } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { searchBooksHybrid } from "@/app/[locale]/actions/search";

/**
 * GET /api/v1/books/search?q=query
 * Search for books using hybrid search (database + Open Library API)
 * Query params:
 *  - q: search query (required)
 *  - offset: number (default: 0, max: 1000)
 *  - limit: number (default: 20, max: 40)
 */
export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const offset = parseIntParam(searchParams.get("offset"), 0, 0, 1000);
  const limit = parseIntParam(searchParams.get("limit"), 20, 1, 40);

  if (!query?.trim()) {
    throw new ApiError("Missing required query parameter: q");
  }

  const results = await searchBooksHybrid(query, offset, limit);

  return createApiResponse({
    results,
    // The external catalog's total is unknown, so a full page means "maybe
    // more" (the next page can come back empty), like the web's "Load more"
    hasMore: results.length === limit,
    offset,
    limit,
  });
});
