import { withAuth, ApiError, parseIntParam } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { getActivityPage } from "@/lib/feed";
import { getProfileAccess } from "@/lib/visibility";

/**
 * GET /api/v1/users/:userId/activity
 * One page of a user's activity, in the shape of GET /feed: books they are
 * reading or finished, and their public reviews when those are visible to
 * the viewer too. 404 when the user's activity isn't visible to the viewer.
 * Query params:
 *  - limit: number (default: 20, max: 50)
 *  - offset: number (default: 0, max: 1000)
 */
export const GET = withAuth(async (request, { user: viewer, params }) => {
  const { searchParams } = new URL(request.url);
  const limit = parseIntParam(searchParams.get("limit"), 20, 1, 50);
  const offset = parseIntParam(searchParams.get("offset"), 0, 0, 1000);

  const profile = await getProfileAccess(viewer.id, params.userId);
  if (!profile?.access.activity) {
    throw new ApiError("User not found", 404);
  }

  return createApiResponse(
    await getActivityPage(viewer.id, [profile.user.id], offset, limit),
  );
});
