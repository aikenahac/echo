import { withAuth, actionError, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { getCollectionById } from "@/app/[locale]/actions/collections";

/**
 * GET /api/v1/collections/:idOrSlug/public
 * View a public collection (any user's) or one of your own private ones, by
 * ID or slug, with the owner, follower count and whether you follow it
 */
export const GET = withAuth(async (request, { params }) => {
  const { id } = params;

  const result = await getCollectionById(id);

  if (result.error) {
    // Other users' private collections are reported as missing
    if (/unauthorized/i.test(result.error)) {
      throw new ApiError("Collection not found", 404);
    }
    throw actionError(result.error);
  }

  const collection = result.collection!;

  return createApiResponse({
    ...collection,
    books: collection.books.map((cb) => cb.userBook),
  });
});
