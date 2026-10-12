import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { userBooks } from "@/db/schema";
import { count, eq, sql } from "drizzle-orm";
import { getYearStats } from "@/lib/reading-stats";

/**
 * GET /api/v1/profile/stats
 * Reading stats for the current user
 */
export const GET = withAuth(async (request, { user }) => {
  const [yearStats, statusRows] = await Promise.all([
    getYearStats(user.id),
    db
      .select({
        status: userBooks.status,
        count: count(),
        favorites: sql<number>`count(*) filter (where ${userBooks.isFavorite})`.mapWith(Number),
      })
      .from(userBooks)
      .where(eq(userBooks.userId, user.id))
      .groupBy(userBooks.status),
  ]);

  const countsByStatus = { want: 0, reading: 0, finished: 0 };
  let favoritesCount = 0;
  for (const row of statusRows) {
    countsByStatus[row.status] = row.count;
    favoritesCount += row.favorites;
  }

  return createApiResponse({
    ...yearStats,
    totalBooks: countsByStatus.want + countsByStatus.reading + countsByStatus.finished,
    countsByStatus,
    favoritesCount,
  });
});
