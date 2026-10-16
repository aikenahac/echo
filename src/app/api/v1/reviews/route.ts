import { NextRequest } from "next/server";
import { withAuth, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { createOrUpdateReview } from "@/app/[locale]/actions/reviews";
import { db } from "@/db";
import { follows, reviews } from "@/db/schema";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { isUuid } from "@/lib/utils";
import { publicUserColumns, publicUserExtras } from "@/lib/public-user";

/**
 * POST /api/v1/reviews
 * Create or update a review for a book
 * Body: { bookId: string, content: string, isPrivate: boolean }
 */
export const POST = withAuth(async (request, { user }) => {
  const body = await request.json();
  const { bookId, content, isPrivate } = body;

  if (!bookId || !content) {
    throw new ApiError("Missing required fields: bookId, content");
  }

  const result = await createOrUpdateReview(
    bookId,
    content,
    isPrivate ?? false,
  );

  if (result.error) {
    throw new ApiError(result.error);
  }

  return createApiResponse(result, 201);
});

/**
 * GET /api/v1/reviews
 * Get user's reviews or reviews for a specific book
 * Query params:
 *  - bookId: filter by catalog book ID (optional)
 *  - scope: "following" to only return public reviews of `bookId` by users
 *    the caller follows (optional, requires bookId)
 */
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");
  const scope = searchParams.get("scope");

  if (scope !== null && scope !== "following") {
    throw new ApiError('Invalid scope. Supported: "following"');
  }

  if (scope && !bookId) {
    throw new ApiError("scope requires bookId");
  }

  if (bookId && !isUuid(bookId)) {
    return createApiResponse([]);
  }

  let query;

  if (bookId && scope === "following") {
    query = db.query.reviews.findMany({
      where: and(
        eq(reviews.bookId, bookId),
        eq(reviews.isPrivate, false),
        inArray(
          reviews.userId,
          db
            .select({ id: follows.followingId })
            .from(follows)
            .where(eq(follows.followerId, user.id)),
        ),
      ),
      with: { user: { columns: publicUserColumns, extras: publicUserExtras }, book: true },
      orderBy: [desc(reviews.createdAt)],
      limit: 100,
    });
  } else if (bookId) {
    // Get reviews for a specific book (only user's own private reviews + all public)
    query = db.query.reviews.findMany({
      where: and(
        eq(reviews.bookId, bookId),
        or(eq(reviews.isPrivate, false), eq(reviews.userId, user.id)),
      ),
      with: { user: { columns: publicUserColumns, extras: publicUserExtras }, book: true },
      orderBy: [desc(reviews.createdAt)],
      limit: 100,
    });
  } else {
    // Get all user's reviews
    query = db.query.reviews.findMany({
      where: eq(reviews.userId, user.id),
      with: { book: true },
      orderBy: [desc(reviews.createdAt)],
    });
  }

  const results = await query;

  return createApiResponse(results);
});
