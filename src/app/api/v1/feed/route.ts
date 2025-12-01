import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { follows, userBooks, reviews } from "@/db/schema";
import { eq, and, inArray, desc, or } from "drizzle-orm";

/**
 * GET /api/v1/feed
 * Get activity feed from users you follow
 * Query params:
 *  - limit: number (default: 20, max: 100)
 *  - offset: number (default: 0)
 */
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "20"),
    100
  );
  const offset = parseInt(searchParams.get("offset") || "0");

  // Get list of users the current user follows
  const following = await db.query.follows.findMany({
    where: eq(follows.followerId, user.id),
  });

  const followingIds = following.map((f) => f.followingId);

  if (followingIds.length === 0) {
    return createApiResponse({
      activities: [],
      hasMore: false,
      total: 0,
    });
  }

  // Fetch recent book activities
  const recentBooks = await db.query.userBooks.findMany({
    where: and(
      inArray(userBooks.userId, followingIds),
      or(eq(userBooks.status, "reading"), eq(userBooks.status, "finished"))
    ),
    with: {
      book: true,
      user: true,
    },
    orderBy: [desc(userBooks.updatedAt)],
    limit: limit + 1, // Fetch one extra to check if there are more
    offset,
  });

  // Fetch recent reviews
  const recentReviews = await db.query.reviews.findMany({
    where: and(
      inArray(reviews.userId, followingIds),
      eq(reviews.isPrivate, false)
    ),
    with: {
      book: true,
      user: true,
    },
    orderBy: [desc(reviews.createdAt)],
    limit: limit + 1,
    offset,
  });

  // Combine and sort activities
  const activities: Array<{
    type: "book" | "review";
    date: string;
    user: {
      id: string;
      username: string | null;
      email: string;
    };
    book: any;
    data: any;
  }> = [
    ...recentBooks.slice(0, limit).map((ub) => ({
      type: "book" as const,
      date: ub.updatedAt.toISOString(),
      user: {
        id: ub.user.id,
        username: ub.user.username,
        email: ub.user.email,
      },
      book: ub.book,
      data: {
        status: ub.status,
        rating: ub.rating,
        currentPage: ub.currentPage,
        finishedAt: ub.finishedAt,
        startedAt: ub.startedAt,
      },
    })),
    ...recentReviews.slice(0, limit).map((r) => ({
      type: "review" as const,
      date: r.createdAt.toISOString(),
      user: {
        id: r.user.id,
        username: r.user.username,
        email: r.user.email,
      },
      book: r.book,
      data: {
        content: r.content,
        isPrivate: r.isPrivate,
      },
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);

  const hasMore =
    recentBooks.length > limit || recentReviews.length > limit;

  return createApiResponse({
    activities,
    hasMore,
    limit,
    offset,
  });
});
