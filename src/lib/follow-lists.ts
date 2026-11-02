import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { and, desc, eq, inArray, notInArray, or } from "drizzle-orm";
import { getBlockedIds } from "@/lib/blocks";
import { isAdminSql } from "@/lib/public-user";

export type FollowDirection = "followers" | "following";

export function isFollowDirection(value: unknown): value is FollowDirection {
  return value === "followers" || value === "following";
}

/**
 * A page of a user's followers or of the users they follow (public columns
 * only), each flagged with how the viewer relates to them: whether the viewer
 * follows them, they follow the viewer, both (friends), or it is the viewer
 */
export async function getFollowList(
  userId: string,
  direction: FollowDirection,
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

  // Follows between the viewer and anyone on the page, either way
  const ids = page.map((u) => u.id);
  const edges = ids.length
    ? await db
        .select({
          followerId: follows.followerId,
          followingId: follows.followingId,
        })
        .from(follows)
        .where(
          or(
            and(
              eq(follows.followerId, viewerId),
              inArray(follows.followingId, ids),
            ),
            and(
              eq(follows.followingId, viewerId),
              inArray(follows.followerId, ids),
            ),
          ),
        )
    : [];
  const followingIds = new Set(
    edges.filter((e) => e.followerId === viewerId).map((e) => e.followingId),
  );
  const followerIds = new Set(
    edges.filter((e) => e.followingId === viewerId).map((e) => e.followerId),
  );

  return {
    results: page.map((u) => {
      const isSelf = u.id === viewerId;
      const isFollowing = !isSelf && followingIds.has(u.id);
      const followsYou = !isSelf && followerIds.has(u.id);
      return {
        ...u,
        isSelf,
        isFollowing,
        followsYou,
        isFriend: isFollowing && followsYou,
      };
    }),
    hasMore: rows.length > limit,
  };
}

export type FollowListUser = Awaited<
  ReturnType<typeof getFollowList>
>["results"][number];
