import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { rateBook } from "@/app/[locale]/actions/books";

/**
 * PUT /api/v1/books/:id/rating
 * Rate a book (1-5 stars)
 * Body: { rating: number }
 */
export const PUT = withAuth(async (request, { user, params }) => {
  const { id } = params;
  const body = await request.json();
  const { rating } = body;

  if (rating === undefined) {
    throw new Error("Missing required field: rating");
  }

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    throw new Error("Rating must be a number between 1 and 5");
  }

  const result = await rateBook(id, rating);

  if (result.error) {
    throw new Error(result.error);
  }

  return createApiResponse(result);
});
