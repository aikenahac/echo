import { withAuth, ApiError, parseIntParam } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getFollowList } from "@/lib/follow-lists";

/**
 * GET /api/v1/users/:userId/followers
 * Users who follow this user, newest follow first
 * Query params:
 *  - limit: number (default: 20, max: 50)
 *  - offset: number (default: 0, max: 10000)
 */
export const GET = withAuth(async (request, { user: viewer, params }) => {
  const { userId } = params;
  const { searchParams } = new URL(request.url);
  const limit = parseIntParam(searchParams.get("limit"), 20, 1, 50);
  const offset = parseIntParam(searchParams.get("offset"), 0, 0, 10_000);

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true },
  });

  if (!target) {
    throw new ApiError("User not found", 404);
  }

  const page = await getFollowList(userId, "followers", viewer.id, limit, offset);

  return createApiResponse(page);
});
