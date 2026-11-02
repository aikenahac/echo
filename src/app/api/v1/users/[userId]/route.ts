import { withAuth, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { getProfileView } from "@/lib/visibility";

/**
 * GET /api/v1/users/:userId
 * A user's profile as the viewer may see it. The header (public columns and
 * bio), follow counts, `relationship` and `access` are always there. Stats,
 * shelves and public collections are filled when `access.content` is true,
 * and are empty otherwise. `access.reviews` and `access.activity` say whether
 * /users/:userId/reviews and /activity will answer. `visibility` is what the
 * owner chose for each part.
 */
export const GET = withAuth(async (request, { user: viewer, params }) => {
  const profile = await getProfileView(viewer.id, params.userId);

  if (!profile) {
    throw new ApiError("User not found", 404);
  }

  const { content, relationship } = profile;

  return createApiResponse({
    user: profile.user,
    relationship,
    access: profile.access,
    visibility: profile.visibility,
    stats: {
      booksFinishedThisYear: content?.yearStats.booksFinishedThisYear ?? 0,
      pagesReadThisYear: content?.yearStats.pagesReadThisYear ?? 0,
      finishedCount: content?.shelves.counts.finished ?? 0,
    },
    counts: {
      want: content?.shelves.counts.want ?? 0,
      finished: content?.shelves.counts.finished ?? 0,
    },
    followerCount: profile.followerCount,
    followingCount: profile.followingCount,
    isFollowing: relationship.isFollowing,
    currentlyReading: content?.shelves.currentlyReading ?? [],
    recentlyFinished: content?.shelves.recentlyFinished ?? [],
    wantToRead: content?.shelves.wantToRead ?? [],
    favorites: content?.shelves.favorites ?? [],
    publicCollections: content?.publicCollections ?? [],
  });
});
