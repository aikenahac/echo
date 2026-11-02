import { db } from "@/db";
import { follows, userBooks, reviews } from "@/db/schema";
import { eq, and, inArray, desc, or } from "drizzle-orm";
import { publicUserColumns, publicUserExtras } from "@/lib/public-user";
import { visibleTo } from "@/lib/visibility";

/**
 * One page of the activity feed from users `userId` follows: books they are
 * reading or finished, and their public reviews, newest first. Shared by
 * GET /api/v1/feed and the Friends page.
 */
export async function getFeedPage(userId: string, offset: number, limit: number) {
  const following = await db.query.follows.findMany({
    where: eq(follows.followerId, userId),
    columns: { followingId: true },
  });

  const followingIds = following.map((f) => f.followingId);

  if (followingIds.length === 0) {
    return { activities: [], hasMore: false, followsAnyone: false };
  }

  const page = await getActivityPage(userId, followingIds, offset, limit);
  return { ...page, followsAnyone: true };
}

/**
 * One page of activity by `ownerIds` as `viewerId` may see it: books they are
 * reading or finished (when their activity is visible to the viewer) and
 * their public reviews (when both their activity and reviews are), newest
 * first. Feeds the Friends feed and the Activity tab of a profile.
 */
export async function getActivityPage(
  viewerId: string,
  ownerIds: string[],
  offset: number,
  limit: number,
) {
  // The feed merges two streams, so each stream must be read from the start
  // up to offset + limit (+1 to detect more) and then merged and paginated
  const window = offset + limit + 1;

  const [recentBooks, recentReviews] = await Promise.all([
    db.query.userBooks.findMany({
      where: and(
        inArray(userBooks.userId, ownerIds),
        or(eq(userBooks.status, "reading"), eq(userBooks.status, "finished")),
        visibleTo(userBooks.userId, "activityVisibility", viewerId),
      ),
      with: {
        book: true,
        user: { columns: publicUserColumns, extras: publicUserExtras },
      },
      orderBy: [desc(userBooks.updatedAt)],
      limit: window,
    }),
    db.query.reviews.findMany({
      where: and(
        inArray(reviews.userId, ownerIds),
        eq(reviews.isPrivate, false),
        visibleTo(reviews.userId, "activityVisibility", viewerId),
        visibleTo(reviews.userId, "reviewVisibility", viewerId),
      ),
      with: {
        book: true,
        user: { columns: publicUserColumns, extras: publicUserExtras },
      },
      orderBy: [desc(reviews.createdAt)],
      limit: window,
    }),
  ]);

  const merged = [
    ...recentBooks.map((ub) => ({
      type: "book" as const,
      date: ub.updatedAt.toISOString(),
      user: ub.user,
      book: ub.book,
      data: {
        status: ub.status,
        rating: ub.rating,
        currentPage: ub.currentPage,
        finishedAt: ub.finishedAt,
        startedAt: ub.startedAt,
      },
    })),
    ...recentReviews.map((r) => ({
      type: "review" as const,
      date: r.createdAt.toISOString(),
      user: r.user,
      book: r.book,
      data: {
        id: r.id,
        content: r.content,
        isPrivate: r.isPrivate,
      },
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return {
    activities: merged.slice(offset, offset + limit),
    hasMore: merged.length > offset + limit,
  };
}

export type FeedActivity = Awaited<
  ReturnType<typeof getActivityPage>
>["activities"][number];
