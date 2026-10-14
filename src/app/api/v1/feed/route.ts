import { withAuth, parseIntParam } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { getFeedPage } from "@/lib/feed";

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

  const { activities, hasMore } = await getFeedPage(user.id, offset, limit);

  return createApiResponse({
    activities,
    hasMore,
    limit,
    offset,
  });
});
