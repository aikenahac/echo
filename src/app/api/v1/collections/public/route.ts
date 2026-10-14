import { withAuth, actionError, parseIntParam } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { getPublicCollections } from "@/app/[locale]/actions/collections";

/**
 * GET /api/v1/collections/public
 * Discover public collections, newest first, with the owner, counts and the
 * first 4 books as a preview
 * Query params:
 *  - limit: number (default: 20, max: 50)
 */
export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const limit = parseIntParam(searchParams.get("limit"), 20, 1, 50);

  const result = await getPublicCollections(limit);

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse(
    result.collections!.map((collection) => ({
      ...collection,
      books: collection.books.map((cb) => cb.userBook),
    })),
  );
});
