import { withAuth, actionError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { unblockUser } from "@/app/[locale]/actions/blocks";

/**
 * DELETE /api/v1/social/block/:userId
 * Unblock a user
 */
export const DELETE = withAuth(async (request, { params }) => {
  const { userId } = params;

  const result = await unblockUser(userId);

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse(result);
});
