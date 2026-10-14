"use server";

import { requireRole } from "@/lib/auth";
import { db } from "@/db";
import {
  users,
  reviews,
  auditLogs,
  books,
  subscriptionPlans,
  userSubscriptions,
} from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { revalidateLocalized } from "@/lib/revalidate";
import { getLemonSqueezy } from "@/lib/lemonsqueezy";

/**
 * Look up a Lemon Squeezy variant for a plan: it must exist and be a
 * subscription. `getVariant` throws on unknown IDs.
 */
async function findSubscriptionVariant(variantId: string) {
  try {
    const variant = await getLemonSqueezy().getVariant(variantId);
    return variant.isSubscription ? variant : null;
  } catch {
    return null;
  }
}

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

    revalidateLocalized("/admin/users");
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

    revalidateLocalized("/admin/content/reviews", `/books/${review.bookId}`);
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

    revalidateLocalized("/admin/content/books", `/books/${bookId}`);
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
 * Update user data (admin only)
 */
export async function updateUserAsAdmin(
  targetUserId: string,
  data: {
    email?: string;
    username?: string | null;
    bio?: string;
    role?: "user" | "moderator" | "admin";
  },
) {
  const currentUser = await requireRole(["admin"]);

  if (currentUser.id === targetUserId && data.role) {
    return { error: "Cannot change your own role" };
  }

  try {
    // Validate username format if provided
    if (data.username !== undefined) {
      if (data.username === null || data.username === "") {
        // Allow clearing username
        data.username = null;
      } else {
        const usernameRegex = /^[a-zA-Z0-9_.]{3,30}$/;
        if (!usernameRegex.test(data.username)) {
          return {
            error:
              "Username must be 3-30 characters and contain only letters, numbers, underscores, and periods",
          };
        }

        // Check if username is already taken
        const existingUser = await db.query.users.findFirst({
          where: eq(users.username, data.username),
        });

        if (existingUser && existingUser.id !== targetUserId) {
          return { error: "Username is already taken" };
        }
      }
    }

    // Validate email format if provided
    if (data.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return { error: "Invalid email format" };
      }

      // Check if email is already taken
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, data.email),
      });

      if (existingUser && existingUser.id !== targetUserId) {
        return { error: "Email is already taken" };
      }
    }

    await db
      .update(users)
      .set({
        email: data.email,
        username: data.username,
        bio: data.bio,
        role: data.role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId));

    // Log the action
    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "user.update",
      targetId: targetUserId,
      targetType: "user",
      metadata: JSON.stringify(data),
    });

    revalidateLocalized("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error updating user:", error);
    return { error: "Failed to update user" };
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

    revalidateLocalized("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { error: "Failed to delete user" };
  }
}

/**
 * Create a new subscription plan (admin only)
 */
export async function createSubscriptionPlan(data: {
  name: string;
  lemonSqueezyVariantId: string | null;
  price: number;
  interval: "month" | "year" | "lifetime" | "free";
  isActive: boolean;
  sortOrder: number;
}) {
  const currentUser = await requireRole(["admin"]);

  try {
    // The product ID is derived from the variant, never entered by hand
    let lemonSqueezyProductId: string | null = null;
    if (data.lemonSqueezyVariantId) {
      const variant = await findSubscriptionVariant(data.lemonSqueezyVariantId);
      if (!variant) {
        return { error: "Invalid Lemon Squeezy variant ID" };
      }
      lemonSqueezyProductId = String(variant.productId);
    }

    const [plan] = await db
      .insert(subscriptionPlans)
      .values({ ...data, lemonSqueezyProductId })
      .returning();

    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "subscription_plan.create",
      targetId: plan.id,
      targetType: "subscription_plan",
      metadata: JSON.stringify(data),
    });

    revalidateLocalized("/admin/subscriptions");

    return { success: true, plan };
  } catch (error) {
    console.error("Error creating subscription plan:", error);
    return { error: "Failed to create subscription plan" };
  }
}

/**
 * Update subscription plan (admin only)
 */
export async function updateSubscriptionPlan(
  planId: string,
  data: Partial<{
    name: string;
    lemonSqueezyVariantId: string | null;
    price: number;
    interval: "month" | "year" | "lifetime" | "free";
    isActive: boolean;
    isInternal: boolean;
    sortOrder: number;
  }>,
) {
  const currentUser = await requireRole(["admin"]);

  try {
    // The product ID is derived from the variant, never entered by hand
    const update: typeof data & { lemonSqueezyProductId?: string | null } = {
      ...data,
    };
    if (data.lemonSqueezyVariantId) {
      const variant = await findSubscriptionVariant(data.lemonSqueezyVariantId);
      if (!variant) {
        return { error: "Invalid Lemon Squeezy variant ID" };
      }
      update.lemonSqueezyProductId = String(variant.productId);
    } else if (data.lemonSqueezyVariantId === null) {
      update.lemonSqueezyProductId = null;
    }

    await db
      .update(subscriptionPlans)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, planId));

    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "subscription_plan.update",
      targetId: planId,
      targetType: "subscription_plan",
      metadata: JSON.stringify(data),
    });

    revalidateLocalized("/admin/subscriptions");

    return { success: true };
  } catch (error) {
    console.error("Error updating subscription plan:", error);
    return { error: "Failed to update subscription plan" };
  }
}

/**
 * Get all subscription plans (admin only)
 */
export async function getAllSubscriptionPlans() {
  await requireRole(["admin"]);

  try {
    const plans = await db.query.subscriptionPlans.findMany({
      orderBy: [asc(subscriptionPlans.sortOrder)],
    });

    return { plans };
  } catch (error) {
    console.error("Error fetching plans:", error);
    return { error: "Failed to fetch plans" };
  }
}

/**
 * Manually grant premium subscription (admin only)
 */
export async function grantPremiumSubscription(
  targetUserId: string,
  planId: string,
) {
  const currentUser = await requireRole(["admin"]);

  try {
    // Create or update the user's subscription
    await db
      .insert(userSubscriptions)
      .values({
        userId: targetUserId,
        planId,
        status: "active",
        currentPeriodStart: new Date(),
      })
      .onConflictDoUpdate({
        target: userSubscriptions.userId,
        set: {
          planId,
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: null, // Manual grants don't expire
          updatedAt: new Date(),
        },
      });

    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "subscription.grant",
      targetId: targetUserId,
      targetType: "user",
      metadata: JSON.stringify({ planId }),
    });

    revalidateLocalized("/admin/users", "/admin/subscriptions");

    return { success: true };
  } catch (error) {
    console.error("Error granting subscription:", error);
    return { error: "Failed to grant subscription" };
  }
}

/**
 * Get all users with their subscription details (admin only)
 */
export async function getAllUsersWithSubscriptions() {
  await requireRole(["admin"]);

  try {
    const allUsers = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
      with: {
        subscription: {
          with: {
            plan: true,
          },
        },
      },
    });

    return { users: allUsers };
  } catch (error) {
    console.error("Error fetching users with subscriptions:", error);
    return { error: "Failed to fetch users" };
  }
}

/**
 * Revoke user's subscription (downgrade to free tier) (admin only)
 */
export async function revokeUserSubscription(targetUserId: string) {
  const currentUser = await requireRole(["admin"]);

  try {
    // Find the free plan
    const freePlan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.interval, "free"),
    });

    if (!freePlan) {
      return { error: "Free plan not found" };
    }

    // Downgrade the user's subscription to the free tier (or create one)
    await db
      .insert(userSubscriptions)
      .values({
        userId: targetUserId,
        planId: freePlan.id,
        status: "active",
        currentPeriodStart: new Date(),
      })
      .onConflictDoUpdate({
        target: userSubscriptions.userId,
        set: {
          planId: freePlan.id,
          status: "canceled",
          lemonSqueezySubscriptionId: null,
          canceledAt: new Date(),
          updatedAt: new Date(),
        },
      });

    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "subscription.revoke",
      targetId: targetUserId,
      targetType: "user",
      metadata: JSON.stringify({ downgradedAt: new Date() }),
    });

    revalidateLocalized("/admin/users", "/admin/subscriptions");

    return { success: true };
  } catch (error) {
    console.error("Error revoking subscription:", error);
    return { error: "Failed to revoke subscription" };
  }
}
