import { withAuth, parseIntParam } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { follows, userBooks, reviews } from "@/db/schema";
import { eq, and, inArray, desc, or } from "drizzle-orm";
import { publicUserColumns } from "@/lib/public-user";

/**
 * GET /api/v1/feed
 * Get activity feed from users you follow
 * Query params:
 *  - limit: number (default: 20, max: 100)
 *  - offset: number (default: 0, max: 1000)
 */
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const limit = parseIntParam(searchParams.get("limit"), 20, 1, 100);
  const offset = parseIntParam(searchParams.get("offset"), 0, 0, 1000);

  // Get list of users the current user follows
  const following = await db.query.follows.findMany({
    where: eq(follows.followerId, user.id),
    columns: { followingId: true },
  });

  const followingIds = following.map((f) => f.followingId);

  if (followingIds.length === 0) {
    return createApiResponse({
      activities: [],
      hasMore: false,
      total: 0,
    });
  }

  // The feed merges two streams, so each stream must be read from the start
  // up to offset + limit (+1 to detect more) and then merged and paginated
  const window = offset + limit + 1;

  const [recentBooks, recentReviews] = await Promise.all([
    db.query.userBooks.findMany({
      where: and(
        inArray(userBooks.userId, followingIds),
        or(eq(userBooks.status, "reading"), eq(userBooks.status, "finished"))
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
        eq(reviews.isPrivate, false)
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

  const activities = merged.slice(offset, offset + limit);
  const hasMore = merged.length > offset + limit;

  return createApiResponse({
    activities,
    hasMore,
    limit,
    offset,
  });
});
