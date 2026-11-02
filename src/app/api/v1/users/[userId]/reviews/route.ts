import { withAuth, ApiError, parseIntParam } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { getProfileAccess, getUserReviewsPage } from "@/lib/visibility";

/**
 * GET /api/v1/users/:userId/reviews
 * One page of a user's reviews not marked private, newest first, with the
 * book. 404 when the user's reviews aren't visible to the viewer.
 * Query params:
 *  - limit: number (default: 20, max: 50)
 *  - offset: number (default: 0, max: 10000)
 */
export const GET = withAuth(async (request, { user: viewer, params }) => {
  const { searchParams } = new URL(request.url);
  const limit = parseIntParam(searchParams.get("limit"), 20, 1, 50);
  const offset = parseIntParam(searchParams.get("offset"), 0, 0, 10_000);

  const profile = await getProfileAccess(viewer.id, params.userId);
  if (!profile?.access.reviews) {
    throw new ApiError("User not found", 404);
  }

  return createApiResponse(
    await getUserReviewsPage(profile.user.id, offset, limit),
  );
});
