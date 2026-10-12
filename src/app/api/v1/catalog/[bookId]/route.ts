import { withAuth, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { getCatalogBookDetail } from "@/lib/book-detail";
import { isUuid } from "@/lib/utils";

/**
 * GET /api/v1/catalog/:bookId
 * Get a catalog book (by catalog book ID, not library entry ID) with the
 * caller's library entry and review, and public reviews of it by users the
 * caller follows
 */
export const GET = withAuth(async (request, { user, params }) => {
  const { bookId } = params;

  const detail = isUuid(bookId)
    ? await getCatalogBookDetail(bookId, user.id)
    : null;

  if (!detail) {
    throw new ApiError("Book not found", 404);
  }

  return createApiResponse(detail);
});
