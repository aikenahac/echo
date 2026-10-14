import { withAuth, ApiError, actionError } from "@/lib/api-handler";
import { addBookToCollection } from "@/app/[locale]/actions/collections";
import { createApiResponse, createErrorResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { collections, collectionBooks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/v1/collections/:id/books
 * Add a book to a collection
 * Body: { userBookId: string }
 */
export const POST = withAuth(async (request, { params }) => {
  const { id: collectionId } = params;
  const body = await request.json();
  const { userBookId } = body;

  if (!userBookId) {
    throw new ApiError("userBookId is required");
  }

  const result = await addBookToCollection(collectionId, userBookId);

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse(result.collectionBook, 201);
});

/**
 * DELETE /api/v1/collections/:id/books/:bookId
 * Remove a book from a collection
 */
export const DELETE = withAuth(async (request, { user, params }) => {
  const { id: collectionId } = params;
  const { searchParams } = new URL(request.url);
  const userBookId = searchParams.get("userBookId");

  if (!userBookId) {
    throw new ApiError("userBookId query parameter is required");
  }

  // Verify collection ownership
  const collection = await db.query.collections.findFirst({
    where: and(
      eq(collections.id, collectionId),
      eq(collections.userId, user.id)
    ),
  });

  if (!collection) {
    return createErrorResponse("Collection not found", 404);
  }

  // Remove from collection
  await db
    .delete(collectionBooks)
    .where(
      and(
        eq(collectionBooks.collectionId, collectionId),
        eq(collectionBooks.userBookId, userBookId)
      )
    );

  return createApiResponse({ success: true });
});
