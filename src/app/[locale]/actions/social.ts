"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidateLocalized } from "@/lib/revalidate";
import { getFeedPage } from "@/lib/feed";
import { isBlockedEitherWay } from "@/lib/blocks";

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

    // A blocked user (either way) looks like a missing one
    if (!target || (await isBlockedEitherWay(userId, followingId))) {
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

const FEED_PAGE_SIZE = 20;
const FEED_MAX_OFFSET = 1000;

/**
 * The next page of the Friends feed (infinite scroll)
 */
export async function loadFeedPage(offset: number) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized", activities: [], hasMore: false };
  }

  const safeOffset = Math.min(
    FEED_MAX_OFFSET,
    Math.max(0, Math.trunc(Number(offset)) || 0),
  );
  const { activities, hasMore } = await getFeedPage(
    userId,
    safeOffset,
    FEED_PAGE_SIZE,
  );
  return { activities, hasMore };
}
