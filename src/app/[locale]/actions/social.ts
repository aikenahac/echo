"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidateLocalized } from "@/lib/revalidate";
import { after } from "next/server";
import { notifyNewFollower } from "@/lib/push";
import { getActivityPage, getFeedPage } from "@/lib/feed";
import { getProfileAccess, getUserReviewsPage } from "@/lib/visibility";
import { isBlockedEitherWay } from "@/lib/blocks";
import { getFollowList, isFollowDirection } from "@/lib/follow-lists";

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

    after(() => notifyNewFollower(userId, followingId));

    revalidateLocalized("/users/search", "/users", "/profile", "/feed");

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

    revalidateLocalized("/users/search", "/users", "/profile", "/feed");

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

const safeOffset = (offset: number) =>
  Math.min(FEED_MAX_OFFSET, Math.max(0, Math.trunc(Number(offset)) || 0));

/**
 * The next page of a reader's Activity tab, when their activity is visible
 */
export async function loadUserActivityPage(targetId: string, offset: number) {
  const { userId } = await auth();
  const profile =
    userId && typeof targetId === "string"
      ? await getProfileAccess(userId, targetId)
      : null;

  if (!userId || !profile?.access.activity) {
    return { error: "Not found", activities: [], hasMore: false };
  }

  const { activities, hasMore } = await getActivityPage(
    userId,
    [profile.user.id],
    safeOffset(offset),
    FEED_PAGE_SIZE,
  );
  return { activities, hasMore };
}

/**
 * The next page of a reader's Reviews tab, when their reviews are visible
 */
export async function loadUserReviewsPage(targetId: string, offset: number) {
  const { userId } = await auth();
  const profile =
    userId && typeof targetId === "string"
      ? await getProfileAccess(userId, targetId)
      : null;

  if (!userId || !profile?.access.reviews) {
    return { error: "Not found", results: [], hasMore: false };
  }

  return getUserReviewsPage(profile.user.id, safeOffset(offset), FEED_PAGE_SIZE);
}

/**
 * The next page of a reader's followers or following, when their profile
 * content is visible (always for the viewer's own lists)
 */
export async function loadFollowListPage(
  targetId: string,
  direction: string,
  offset: number,
) {
  const { userId } = await auth();
  const profile =
    userId && typeof targetId === "string" && isFollowDirection(direction)
      ? await getProfileAccess(userId, targetId)
      : null;

  if (!userId || !isFollowDirection(direction) || !profile?.access.content) {
    return { error: "Not found", results: [], hasMore: false };
  }

  return getFollowList(
    profile.user.id,
    direction,
    userId,
    FEED_PAGE_SIZE,
    safeOffset(offset),
  );
}
