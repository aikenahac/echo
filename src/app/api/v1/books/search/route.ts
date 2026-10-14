import { withAuth, ApiError, parseIntParam } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { searchCatalog } from "@/lib/catalog-search";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/v1/books/search?q=query&page=1
 * Books we already have, plus our stored copy of Open Library's results.
 * Query params:
 *  - q: search query (required)
 *  - page: Open Library results page, 20 per page (default: 1, max: 50)
 *
 * `openLibrary.status` is "miss" when we hold no fresh copy of that page: the
 * client then calls Open Library itself and reports the results to
 * POST /books/search/ingest.
 */
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const page = parseIntParam(searchParams.get("page"), 1, 1, 50);

  if (!query?.trim()) {
    throw new ApiError("Missing required query parameter: q");
  }
  if (!rateLimit(`search:${user.id}`, 60, 60_000)) {
    throw new ApiError("Too many searches", 429);
  }

  return createApiResponse(await searchCatalog(query, page));
});
