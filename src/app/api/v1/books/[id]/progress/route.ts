import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import {
  updateReadingProgress,
  updateBookPageCount,
} from "@/app/[locale]/actions/books";

/**
 * PUT /api/v1/books/:id/progress
 * Update reading progress (current page, or page count)
 * Body: { currentPage?: number, pageCount?: number }
 */
export const PUT = withAuth(async (request, { user, params }) => {
  const { id } = params;
  const body = await request.json();
  const { currentPage, pageCount } = body;

  // Handle page count update
  if (pageCount !== undefined) {
    const result = await updateBookPageCount(id, pageCount);
    if (result.error) {
      throw new Error(result.error);
    }

    return createApiResponse(result);
  }

  // Handle current page update
  if (currentPage !== undefined) {
    const result = await updateReadingProgress(id, currentPage);
    if (result.error) {
      throw new Error(result.error);
    }
    return createApiResponse(result);
  }

  throw new Error("Missing required field: currentPage or pageCount");
});
