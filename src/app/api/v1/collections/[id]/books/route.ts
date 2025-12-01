import { withAuth } from "@/lib/api-handler";
import { createApiResponse, createErrorResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { collections, collectionBooks, userBooks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/v1/collections/:id/books
 * Add a book to a collection
 * Body: { userBookId: string }
 */
export const POST = withAuth(async (request, { user, params }) => {
  const { id: collectionId } = params;
  const body = await request.json();
  const { userBookId } = body;

  if (!userBookId) {
    throw new Error("userBookId is required");
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

  // Verify user owns the book
  const userBook = await db.query.userBooks.findFirst({
    where: and(eq(userBooks.id, userBookId), eq(userBooks.userId, user.id)),
  });

  if (!userBook) {
    return createErrorResponse("Book not found in your library", 404);
  }

  // Check if already in collection
  const existing = await db.query.collectionBooks.findFirst({
    where: and(
      eq(collectionBooks.collectionId, collectionId),
      eq(collectionBooks.userBookId, userBookId)
    ),
  });

  if (existing) {
    throw new Error("Book already in this collection");
  }

  // Add book to collection
  const [added] = await db
    .insert(collectionBooks)
    .values({
      collectionId,
      userBookId,
    })
    .returning();

  return createApiResponse(added, 201);
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
    throw new Error("userBookId query parameter is required");
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
