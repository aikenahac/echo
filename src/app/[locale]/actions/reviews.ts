"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidateLocalized } from "@/lib/revalidate";

const MAX_REVIEW_LENGTH = 10_000;

/**
 * Create or update a review for a book
 */
export async function createOrUpdateReview(
  bookId: string,
  content: string,
  isPrivate: boolean,
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  if (typeof content !== "string" || !content.trim()) {
    return { error: "Review content cannot be empty" };
  }

  if (content.length > MAX_REVIEW_LENGTH) {
    return { error: "Review is too long" };
  }

  try {
    // One review per user per book: create it or update the existing one
    await db
      .insert(reviews)
      .values({
        userId,
        bookId,
        content,
        isPrivate,
      })
      .onConflictDoUpdate({
        target: [reviews.userId, reviews.bookId],
        set: {
          content,
          isPrivate,
          updatedAt: new Date(),
        },
      });

    revalidateLocalized(`/books/${bookId}`, "/feed");

    return { success: true };
  } catch (error) {
    console.error("Error creating/updating review:", error);
    return { error: "Failed to save review" };
  }
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    const [review] = await db
      .delete(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.userId, userId)))
      .returning({ bookId: reviews.bookId });

    if (!review) {
      return { error: "Review not found" };
    }

    revalidateLocalized(`/books/${review.bookId}`, "/feed");

    return { success: true };
  } catch (error) {
    console.error("Error deleting review:", error);
    return { error: "Failed to delete review" };
  }
}
