import { db } from "@/db";
import { follows, userBooks, reviews } from "@/db/schema";
import { eq, and, inArray, desc, or } from "drizzle-orm";
import { publicUserColumns } from "@/lib/public-user";

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

  // The feed merges two streams, so each stream must be read from the start
  // up to offset + limit (+1 to detect more) and then merged and paginated
  const window = offset + limit + 1;

  const [recentBooks, recentReviews] = await Promise.all([
    db.query.userBooks.findMany({
      where: and(
        inArray(userBooks.userId, followingIds),
        or(eq(userBooks.status, "reading"), eq(userBooks.status, "finished")),
      ),
      with: {
        book: true,
        user: { columns: publicUserColumns },
      },
      orderBy: [desc(userBooks.updatedAt)],
      limit: window,
    }),
    db.query.reviews.findMany({
      where: and(
        inArray(reviews.userId, followingIds),
        eq(reviews.isPrivate, false),
      ),
      with: {
        book: true,
        user: { columns: publicUserColumns },
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
        content: r.content,
        isPrivate: r.isPrivate,
      },
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return {
    activities: merged.slice(offset, offset + limit),
    hasMore: merged.length > offset + limit,
    followsAnyone: true,
  };
}

export type FeedActivity = Awaited<
  ReturnType<typeof getFeedPage>
>["activities"][number];
