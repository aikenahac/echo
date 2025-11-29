"use server";

import { requireRole } from "@/lib/auth";
import { db } from "@/db";
import { users, reviews, auditLogs, books } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Update a user's role (admin only)
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: "user" | "moderator" | "admin",
) {
  const currentUser = await requireRole(["admin"]);

  if (currentUser.id === targetUserId) {
    return { error: "Cannot change your own role" };
  }

  try {
    await db
      .update(users)
      .set({ role: newRole, updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    // Log the action
    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "user.role.update",
      targetId: targetUserId,
      targetType: "user",
      metadata: JSON.stringify({ newRole }),
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { error: "Failed to update user role" };
  }
}

/**
 * Delete a review as a moderator or admin
 */
export async function deleteReviewAsAdmin(reviewId: string) {
  const currentUser = await requireRole(["moderator", "admin"]);

  try {
    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
    });

    if (!review) {
      return { error: "Review not found" };
    }

    await db.delete(reviews).where(eq(reviews.id, reviewId));

    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "review.delete",
      targetId: reviewId,
      targetType: "review",
      metadata: JSON.stringify({ bookId: review.bookId }),
    });

    revalidatePath("/admin/content/reviews");
    revalidatePath(`/books/${review.bookId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting review:", error);
    return { error: "Failed to delete review" };
  }
}

/**
 * Update book information as an admin
 */
export async function updateBookAsAdmin(
  bookId: string,
  data: {
    title?: string;
    author?: string;
    isbn?: string;
    pages?: number;
    publishedYear?: number;
  },
) {
  const currentUser = await requireRole(["admin"]);

  try {
    await db.update(books).set(data).where(eq(books.id, bookId));

    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "book.update",
      targetId: bookId,
      targetType: "book",
      metadata: JSON.stringify(data),
    });

    revalidatePath("/admin/content/books");
    revalidatePath(`/books/${bookId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating book:", error);
    return { error: "Failed to update book" };
  }
}

/**
 * Get audit logs (admin only)
 */
export async function getAuditLogs(limit = 100) {
  await requireRole(["admin"]);

  try {
    const logs = await db.query.auditLogs.findMany({
      orderBy: [desc(auditLogs.createdAt)],
      limit,
      with: {
        user: true,
      },
    });

    return { logs };
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return { error: "Failed to fetch audit logs" };
  }
}

/**
 * Delete a user and all their data (admin only)
 */
export async function deleteUserAsAdmin(targetUserId: string) {
  const currentUser = await requireRole(["admin"]);

  if (currentUser.id === targetUserId) {
    return { error: "Cannot delete your own account" };
  }

  try {
    // Delete user (cascades to userBooks, reviews, follows, auditLogs)
    await db.delete(users).where(eq(users.id, targetUserId));

    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "user.delete",
      targetId: targetUserId,
      targetType: "user",
      metadata: JSON.stringify({ deletedAt: new Date() }),
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { error: "Failed to delete user" };
  }
}
