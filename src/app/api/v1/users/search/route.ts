import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { users, follows } from "@/db/schema";
import { or, ilike, eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * GET /api/v1/users/search
 * Search for users by username or email
 * Query params:
 *  - q: search query (required)
 *  - limit: number (default: 20, max: 50)
 */
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "20"),
    50
  );

  if (!query || query.trim().length === 0) {
    throw new Error("Search query (q) is required");
  }

  if (query.trim().length < 2) {
    throw new Error("Search query must be at least 2 characters");
  }

  // Search for users
  const searchResults = await db.query.users.findMany({
    where: or(
      ilike(users.username, `%${query}%`),
      ilike(users.email, `%${query}%`)
    ),
    limit: limit + 1, // Fetch one extra to check if there are more
  });

  // Filter out current user
  const filtered = searchResults.filter((u) => u.id !== user.id);

  // Get current user's following list
  const followingList = await db.query.follows.findMany({
    where: eq(follows.followerId, user.id),
  });
  const followingIds = new Set(followingList.map((f) => f.followingId));

  // Transform results to include following status
  const results = filtered.slice(0, limit).map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    bio: u.bio,
    isFollowing: followingIds.has(u.id),
  }));

  return createApiResponse({
    results,
    hasMore: filtered.length > limit,
    total: results.length,
    query,
  });
});
