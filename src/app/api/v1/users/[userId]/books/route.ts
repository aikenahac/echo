import { withAuth, ApiError, parseIntParam } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import {
  getProfileAccess,
  getUserShelfPage,
  isProfileShelf,
} from "@/lib/visibility";

/**
 * GET /api/v1/users/:userId/books
 * One page of a user's shelf, with the catalog book. 404 when the user's
 * profile content isn't visible to the viewer.
 * Query params:
 *  - shelf: "reading" | "want" | "finished" | "favourites" (required)
 *  - limit: number (default: 24, max: 60)
 *  - offset: number (default: 0, max: 10000)
 */
export const GET = withAuth(async (request, { user: viewer, params }) => {
  const { searchParams } = new URL(request.url);
  const shelf = searchParams.get("shelf");
  const limit = parseIntParam(searchParams.get("limit"), 24, 1, 60);
  const offset = parseIntParam(searchParams.get("offset"), 0, 0, 10_000);

  if (!isProfileShelf(shelf)) {
    throw new ApiError("shelf must be reading, want, finished or favourites");
  }

  const profile = await getProfileAccess(viewer.id, params.userId);
  if (!profile?.access.content) {
    throw new ApiError("User not found", 404);
  }

  return createApiResponse(
    await getUserShelfPage(profile.user.id, shelf, offset, limit),
  );
});
