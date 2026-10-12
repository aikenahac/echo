"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidateLocalized } from "@/lib/revalidate";

/**
 * Follow a user
 */
export async function followUser(followingId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  if (userId === followingId) {
    return { error: "You cannot follow yourself" };
  }

  try {
    // Only follow users that actually exist
    const target = await db.query.users.findFirst({
      where: eq(users.id, followingId),
      columns: { id: true },
    });

    if (!target) {
      return { error: "User not found" };
    }

    const [created] = await db
      .insert(follows)
      .values({
        followerId: userId,
        followingId,
      })
      .onConflictDoNothing()
      .returning();

    if (!created) {
      return { error: "Already following this user" };
    }

    revalidateLocalized("/users/search", "/profile", "/feed");

    return { success: true };
  } catch (error) {
    console.error("Error following user:", error);
    return { error: "Failed to follow user" };
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followingId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, userId),
          eq(follows.followingId, followingId),
        ),
      );

    revalidateLocalized("/users/search", "/profile", "/feed");

    return { success: true };
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return { error: "Failed to unfollow user" };
  }
}
