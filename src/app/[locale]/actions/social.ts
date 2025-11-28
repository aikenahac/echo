"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
    // Ensure both users exist in database
    await db
      .insert(users)
      .values({
        id: userId,
        email: "",
      })
      .onConflictDoNothing();

    await db
      .insert(users)
      .values({
        id: followingId,
        email: "",
      })
      .onConflictDoNothing();

    // Check if already following
    const existing = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, userId),
        eq(follows.followingId, followingId)
      ),
    });

    if (existing) {
      return { error: "Already following this user" };
    }

    // Create follow relationship
    await db.insert(follows).values({
      followerId: userId,
      followingId,
    });

    revalidatePath("/users/search");
    revalidatePath("/profile/following");
    revalidatePath("/profile/followers");

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
        and(eq(follows.followerId, userId), eq(follows.followingId, followingId))
      );

    revalidatePath("/users/search");
    revalidatePath("/profile/following");
    revalidatePath("/profile/followers");

    return { success: true };
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return { error: "Failed to unfollow user" };
  }
}
