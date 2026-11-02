import { withAuth, ApiError, parseIntParam } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { getFollowList } from "@/lib/follow-lists";
import { getProfileAccess } from "@/lib/visibility";

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

  // Follow lists are profile content
  const profile = await getProfileAccess(viewer.id, userId);
  if (!profile?.access.content) {
    throw new ApiError("User not found", 404);
  }

  const page = await getFollowList(
    profile.user.id,
    "followers",
    viewer.id,
    limit,
    offset,
  );

  return createApiResponse(page);
});
