import { NextRequest } from "next/server";
import { withAuth, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { followUser } from "@/app/[locale]/actions/social";

/**
 * POST /api/v1/social/follow
 * Follow a user
 * Body: { userId: string }
 */
export const POST = withAuth(async (request, { user }) => {
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    throw new ApiError("Missing required field: userId");
  }

  const result = await followUser(userId);

  if (result.error) {
    throw new ApiError(result.error);
  }

  return createApiResponse(result, 201);
});
