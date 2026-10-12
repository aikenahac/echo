import { withAuth, ApiError, actionError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import {
  updateBookCurrentPage,
  updateBookPageCount,
} from "@/app/[locale]/actions/books";
import { isUuid } from "@/lib/utils";

/**
 * PUT /api/v1/books/:id/progress
 * Update reading progress (current page and/or page count). When both are
 * sent, the page count is applied first. Setting the current page follows the
 * same rules as the web: it can't exceed the page count, reaching it marks the
 * book finished, and any other page above 0 marks it reading.
 * Body: { currentPage?: number, pageCount?: number }
 */
export const PUT = withAuth(async (request, { params }) => {
  const { id } = params;
  const body = await request.json();
  const { currentPage, pageCount } = body ?? {};

  if (currentPage === undefined && pageCount === undefined) {
    throw new ApiError("Missing required field: currentPage or pageCount");
  }

  if (!isUuid(id)) {
    throw new ApiError("Book not found in your library", 404);
  }

  if (pageCount !== undefined) {
    const result = await updateBookPageCount(id, pageCount);
    if (result.error) {
      throw actionError(result.error);
    }
  }

  if (currentPage !== undefined) {
    const result = await updateBookCurrentPage(id, currentPage);
    if (result.error) {
      throw actionError(result.error);
    }
  }

  return createApiResponse({ success: true });
});
