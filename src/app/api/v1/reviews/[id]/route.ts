import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { deleteReview, createOrUpdateReview } from "@/app/[locale]/actions/reviews";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/v1/reviews/:id
 * Get a specific review
 */
export const GET = withAuth(async (request, { user, params }) => {
  const { id } = params;

  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, id),
    with: { user: true, book: true },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  // Only owner can see private reviews
  if (review.isPrivate && review.userId !== user.id) {
    throw new Error("Review not found");
  }

  return createApiResponse(review);
});

/**
 * PUT /api/v1/reviews/:id
 * Update a review
 * Body: { content: string, isPrivate: boolean }
 */
export const PUT = withAuth(async (request, { user, params }) => {
  const { id } = params;
  const body = await request.json();
  const { content, isPrivate } = body;

  // Verify ownership
  const review = await db.query.reviews.findFirst({
    where: and(eq(reviews.id, id), eq(reviews.userId, user.id)),
  });

  if (!review) {
    throw new Error("Review not found or you don't have permission to update it");
  }

  if (!content) {
    throw new Error("Missing required field: content");
  }

  // Update review
  await db
    .update(reviews)
    .set({
      content,
      isPrivate: isPrivate ?? review.isPrivate,
      updatedAt: new Date(),
    })
    .where(eq(reviews.id, id));

  return createApiResponse({ success: true });
});

/**
 * DELETE /api/v1/reviews/:id
 * Delete a review
 */
export const DELETE = withAuth(async (request, { user, params }) => {
  const { id } = params;

  // Verify ownership before deletion
  const review = await db.query.reviews.findFirst({
    where: and(eq(reviews.id, id), eq(reviews.userId, user.id)),
  });

  if (!review) {
    throw new Error("Review not found or you don't have permission to delete it");
  }

  const result = await deleteReview(id);

  if (result.error) {
    throw new Error(result.error);
  }

  return createApiResponse(result);
});
