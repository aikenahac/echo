import { NextRequest } from "next/server";
import { withAuth, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { createOrUpdateReview } from "@/app/[locale]/actions/reviews";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { and, desc, eq, or } from "drizzle-orm";
import { publicUserColumns } from "@/lib/public-user";

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
 *  - bookId: filter by book ID (optional)
 */
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");

  let query;

  if (bookId) {
    // Get reviews for a specific book (only user's own private reviews + all public)
    query = db.query.reviews.findMany({
      where: and(
        eq(reviews.bookId, bookId),
        or(eq(reviews.isPrivate, false), eq(reviews.userId, user.id)),
      ),
      with: { user: { columns: publicUserColumns }, book: true },
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
