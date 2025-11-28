"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { reviews, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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

  if (!content.trim()) {
    return { error: "Review content cannot be empty" };
  }

  try {
    // Ensure user exists in our database
    await db
      .insert(users)
      .values({
        id: userId,
        email: "", // Will be updated from Clerk webhook
      })
      .onConflictDoNothing();

    // Check if review already exists
    const existingReview = await db.query.reviews.findFirst({
      where: and(eq(reviews.userId, userId), eq(reviews.bookId, bookId)),
    });

    if (existingReview) {
      // Update existing review
      await db
        .update(reviews)
        .set({
          content,
          isPrivate,
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, existingReview.id));
    } else {
      // Create new review
      await db.insert(reviews).values({
        userId,
        bookId,
        content,
        isPrivate,
      });
    }

    revalidatePath(`/books/${bookId}`);
    revalidatePath("/feed");

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
    const review = await db.query.reviews.findFirst({
      where: and(eq(reviews.id, reviewId), eq(reviews.userId, userId)),
    });

    if (!review) {
      return { error: "Review not found" };
    }

    await db.delete(reviews).where(eq(reviews.id, reviewId));

    revalidatePath(`/books/${review.bookId}`);
    revalidatePath("/feed");

    return { success: true };
  } catch (error) {
    console.error("Error deleting review:", error);
    return { error: "Failed to delete review" };
  }
}
