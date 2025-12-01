import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { userBooks, userSubscriptions } from "@/db/schema";
import { eq, gte, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * GET /api/v1/subscriptions/usage
 * Get user's usage statistics for the current period
 */
export const GET = withAuth(async (request, { user }) => {
  // Get user's subscription
  const subscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, user.id),
    with: {
      plan: true,
    },
  });

  // Parse features JSON to get maxBooksPerYear
  let maxBooksPerYear = 50; // Default free plan limit
  if (subscription?.plan?.features) {
    try {
      const features = JSON.parse(subscription.plan.features);
      maxBooksPerYear = features.maxBooksPerYear ?? 50;
    } catch {
      maxBooksPerYear = 50;
    }
  }

  // Determine if user has unlimited books (null or -1 means unlimited)
  const hasUnlimited = maxBooksPerYear === null || maxBooksPerYear === -1;

  // Get current year start date
  const currentYearStart = new Date(new Date().getFullYear(), 0, 1);

  // Count books added this year
  const booksThisYear = await db
    .select({ count: sql<number>`count(*)` })
    .from(userBooks)
    .where(
      and(eq(userBooks.userId, user.id), gte(userBooks.createdAt, currentYearStart))
    );

  const booksAdded = Number(booksThisYear[0]?.count || 0);
  const limit = maxBooksPerYear;

  return createApiResponse({
    booksAdded,
    limit: hasUnlimited ? null : limit,
    hasUnlimited,
    period: {
      start: currentYearStart,
      end: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59),
    },
    percentageUsed: hasUnlimited ? 0 : Math.round((booksAdded / limit) * 100),
    remainingBooks: hasUnlimited ? null : Math.max(0, limit - booksAdded),
  });
});
