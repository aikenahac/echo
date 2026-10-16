import { withAuth, ApiError, parseIntParam } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { users, follows } from "@/db/schema";
import { or, ilike, eq, and, inArray, ne } from "drizzle-orm";
import { escapeLike } from "@/lib/utils";

/**
 * GET /api/v1/users/search
 * Search for users by username or display name
 * Query params:
 *  - q: search query (required)
 *  - limit: number (default: 20, max: 50)
 */
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const limit = parseIntParam(searchParams.get("limit"), 20, 1, 50);

  if (!query) {
    throw new ApiError("Search query (q) is required");
  }

  if (query.length < 2) {
    throw new ApiError("Search query must be at least 2 characters");
  }

  const pattern = `%${escapeLike(query)}%`;

  // Search for users (excluding the current user). Emails are never searched
  // or returned, so they can't be enumerated.
  const searchResults = await db.query.users.findMany({
    where: and(
      ne(users.id, user.id),
      or(ilike(users.username, pattern), ilike(users.displayName, pattern))
    ),
    columns: {
      id: true,
      username: true,
      displayName: true,
      profilePictureUrl: true,
      profilePictureBlurhash: true,
      bio: true,
    },
    limit: limit + 1, // Fetch one extra to check if there are more
  });

  const page = searchResults.slice(0, limit);

  // Which of these users the current user follows
  const followingList = page.length
    ? await db.query.follows.findMany({
        where: and(
          eq(follows.followerId, user.id),
          inArray(
            follows.followingId,
            page.map((u) => u.id)
          )
        ),
        columns: { followingId: true },
      })
    : [];
  const followingIds = new Set(followingList.map((f) => f.followingId));

  // Transform results to include following status
  const results = page.map((u) => ({
    ...u,
    isFollowing: followingIds.has(u.id),
  }));

  return createApiResponse({
    results,
    hasMore: searchResults.length > limit,
    total: results.length,
    query,
  });
});
