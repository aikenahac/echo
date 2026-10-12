import { withAuth, actionError, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import {
  followCollection,
  unfollowCollection,
} from "@/app/[locale]/actions/collections";
import { isUuid } from "@/lib/utils";

/**
 * POST /api/v1/collections/:id/follow
 * Follow another user's public collection
 */
export const POST = withAuth(async (request, { params }) => {
  const { id } = params;

  if (!isUuid(id)) {
    throw new ApiError("Collection not found", 404);
  }

  const result = await followCollection(id);

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse(result, 201);
});

/**
 * DELETE /api/v1/collections/:id/follow
 * Unfollow a collection
 */
export const DELETE = withAuth(async (request, { params }) => {
  const { id } = params;

  if (!isUuid(id)) {
    throw new ApiError("Collection not found", 404);
  }

  const result = await unfollowCollection(id);

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse(result);
});
