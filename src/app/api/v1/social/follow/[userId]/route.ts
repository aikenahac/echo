import { NextRequest } from "next/server";
import { withAuth, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { unfollowUser } from "@/app/[locale]/actions/social";

/**
 * DELETE /api/v1/social/follow/:userId
 * Unfollow a user
 */
export const DELETE = withAuth(async (request, { user, params }) => {
  const { userId } = params;

  const result = await unfollowUser(userId);

  if (result.error) {
    throw new ApiError(result.error);
  }

  return createApiResponse(result);
});
