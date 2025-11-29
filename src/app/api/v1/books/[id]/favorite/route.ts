import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { toggleBookFavorite } from "@/app/[locale]/actions/books";

/**
 * PUT /api/v1/books/:id/favorite
 * Toggle or set favorite status for a book
 * Body: { isFavorite: boolean }
 */
export const PUT = withAuth(async (request, { user, params }) => {
  const { id } = params;
  const body = await request.json();
  const { isFavorite } = body;

  if (isFavorite === undefined) {
    throw new Error("Missing required field: isFavorite");
  }

  if (typeof isFavorite !== "boolean") {
    throw new Error("isFavorite must be a boolean");
  }

  const result = await toggleBookFavorite(id, isFavorite);

  if (result.error) {
    throw new Error(result.error);
  }

  return createApiResponse(result);
});
