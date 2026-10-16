import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { and, desc, eq, inArray, notInArray } from "drizzle-orm";
import { getBlockedIds } from "@/lib/blocks";
import { isAdminSql } from "@/lib/public-user";

/**
 * A page of a user's followers or of the users they follow (public columns
 * only), each flagged with whether the viewer follows them
 */
export async function getFollowList(
  userId: string,
  direction: "followers" | "following",
  viewerId: string,
  limit: number,
  offset: number,
) {
  // followers: rows where the user is followed; list the followers
  const [matchColumn, listedColumn] =
    direction === "followers"
      ? [follows.followingId, follows.followerId]
      : [follows.followerId, follows.followingId];

  const blockedIds = await getBlockedIds(viewerId);

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      profilePictureUrl: users.profilePictureUrl,
      profilePictureBlurhash: users.profilePictureBlurhash,
      isAdmin: isAdminSql(users.role),
    })
    .from(follows)
    .innerJoin(users, eq(users.id, listedColumn))
    .where(
      and(
        eq(matchColumn, userId),
        blockedIds.length ? notInArray(listedColumn, blockedIds) : undefined,
      ),
    )
    .orderBy(desc(follows.createdAt), users.id)
    .limit(limit + 1) // Fetch one extra to check if there are more
    .offset(offset);

  const page = rows.slice(0, limit);

  const viewerFollows = page.length
    ? await db
        .select({ id: follows.followingId })
        .from(follows)
        .where(
          and(
            eq(follows.followerId, viewerId),
            inArray(
              follows.followingId,
              page.map((u) => u.id),
            ),
          ),
        )
    : [];
  const followingIds = new Set(viewerFollows.map((f) => f.id));

  return {
    results: page.map((u) => ({ ...u, isFollowing: followingIds.has(u.id) })),
    hasMore: rows.length > limit,
  };
}
