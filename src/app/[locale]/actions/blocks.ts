"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { blocks, follows, users } from "@/db/schema";
import { isAdminSql } from "@/lib/public-user";
import { revalidateLocalized } from "@/lib/revalidate";

/**
 * Block a user. Hides both users from each other (feed, reviews, search,
 * profiles) and removes any follow between them, in both directions.
 */
export async function blockUser(blockedId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  if (typeof blockedId !== "string" || !blockedId) {
    return { error: "User not found" };
  }

  if (userId === blockedId) {
    return { error: "You cannot block yourself" };
  }

  try {
    const target = await db.query.users.findFirst({
      where: eq(users.id, blockedId),
      columns: { id: true },
    });

    if (!target) {
      return { error: "User not found" };
    }

    await db.transaction(async (tx) => {
      await tx
        .insert(blocks)
        .values({ blockerId: userId, blockedId })
        .onConflictDoNothing();

      await tx
        .delete(follows)
        .where(
          or(
            and(
              eq(follows.followerId, userId),
              eq(follows.followingId, blockedId),
            ),
            and(
              eq(follows.followerId, blockedId),
              eq(follows.followingId, userId),
            ),
          ),
        );
    });

    revalidateLocalized("/feed", "/library", "/search", "/profile", "/settings");

    return { success: true };
  } catch (error) {
    console.error("Error blocking user:", error);
    return { error: "Failed to block user" };
  }
}

/**
 * Unblock a user. Follows removed by the block are not restored.
 */
export async function unblockUser(blockedId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    await db
      .delete(blocks)
      .where(and(eq(blocks.blockerId, userId), eq(blocks.blockedId, blockedId)));

    revalidateLocalized("/feed", "/library", "/search", "/profile", "/settings");

    return { success: true };
  } catch (error) {
    console.error("Error unblocking user:", error);
    return { error: "Failed to unblock user" };
  }
}

/**
 * Users the viewer has blocked, newest first (public columns only)
 */
export async function listBlockedUsers(viewerId?: string) {
  const userId = viewerId ?? (await auth()).userId;

  if (!userId) {
    return { error: "Unauthorized", users: [] };
  }

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      profilePictureUrl: users.profilePictureUrl,
      profilePictureBlurhash: users.profilePictureBlurhash,
      isAdmin: isAdminSql(users.role),
    })
    .from(blocks)
    .innerJoin(users, eq(users.id, blocks.blockedId))
    .where(eq(blocks.blockerId, userId))
    .orderBy(desc(blocks.createdAt), users.id);

  return { users: rows };
}
