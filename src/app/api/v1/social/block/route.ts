import { withAuth, ApiError, actionError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { blockUser } from "@/app/[locale]/actions/blocks";

/**
 * POST /api/v1/social/block
 * Block a user (hides you from each other and removes any follows)
 * Body: { userId: string }
 */
export const POST = withAuth(async (request) => {
  const body = await request.json();
  const { userId } = body;

  if (typeof userId !== "string" || !userId) {
    throw new ApiError("Missing required field: userId");
  }

  const result = await blockUser(userId);

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse(result, 201);
});
