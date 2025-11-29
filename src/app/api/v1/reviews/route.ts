import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { createOrUpdateReview } from "@/app/[locale]/actions/reviews";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/v1/reviews
 * Create or update a review for a book
 * Body: { bookId: string, content: string, isPrivate: boolean }
 */
export const POST = withAuth(async (request, { user }) => {
  const body = await request.json();
  const { bookId, content, isPrivate } = body;

  if (!bookId || !content) {
    throw new Error("Missing required fields: bookId, content");
  }

  const result = await createOrUpdateReview(
    bookId,
    content,
    isPrivate ?? false,
  );

  if (result.error) {
    throw new Error(result.error);
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
      where: eq(reviews.bookId, bookId),
      with: { user: true, book: true },
    });
  } else {
    // Get all user's reviews
    query = db.query.reviews.findMany({
      where: eq(reviews.userId, user.id),
      with: { book: true },
    });
  }

  const results = await query;

  return createApiResponse(results);
});
