import { withAuth, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { db } from "@/db";
import {
  collectionBooks,
  collections,
  follows,
  userBooks,
  users,
} from "@/db/schema";
import { and, asc, count, eq, getTableColumns } from "drizzle-orm";
import { publicUserColumns } from "@/lib/public-user";
import { getProfileShelves, getYearStats } from "@/lib/reading-stats";

/**
 * GET /api/v1/users/:userId
 * A user's public profile: public columns and bio, reading stats, follow
 * counts, profile shelves and public collections. Reviews aren't included.
 */
export const GET = withAuth(async (request, { user: viewer, params }) => {
  const { userId } = params;

  const profile = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { ...publicUserColumns, bio: true },
  });

  if (!profile) {
    throw new ApiError("User not found", 404);
  }

  const [
    yearStats,
    [finished],
    [followers],
    [following],
    viewerFollow,
    shelves,
    publicCollections,
  ] = await Promise.all([
    getYearStats(userId),
    db
      .select({ count: count() })
      .from(userBooks)
      .where(
        and(eq(userBooks.userId, userId), eq(userBooks.status, "finished")),
      ),
    db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, userId)),
    db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followerId, userId)),
    db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, viewer.id),
        eq(follows.followingId, userId),
      ),
      columns: { followerId: true },
    }),
    getProfileShelves(userId),
    db
      .select({
        ...getTableColumns(collections),
        bookCount: count(collectionBooks.userBookId),
      })
      .from(collections)
      .leftJoin(
        collectionBooks,
        eq(collectionBooks.collectionId, collections.id),
      )
      .where(
        and(eq(collections.userId, userId), eq(collections.isPublic, true)),
      )
      .groupBy(collections.id)
      .orderBy(asc(collections.sortOrder)),
  ]);

  return createApiResponse({
    user: profile,
    stats: {
      booksFinishedThisYear: yearStats.booksFinishedThisYear,
      finishedCount: finished?.count ?? 0,
    },
    followerCount: followers?.count ?? 0,
    followingCount: following?.count ?? 0,
    isFollowing: !!viewerFollow,
    currentlyReading: shelves.currentlyReading,
    recentlyFinished: shelves.recentlyFinished,
    favorites: shelves.favorites,
    publicCollections,
  });
});
