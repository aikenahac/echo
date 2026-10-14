import { withAuth, actionError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { reorderCollections } from "@/app/[locale]/actions/collections";

/**
 * PUT /api/v1/collections/order
 * Reorder your collections
 * Body: { order: string[] } (every one of your collection IDs, in the new order)
 */
export const PUT = withAuth(async (request) => {
  const body = await request.json();

  const result = await reorderCollections(body?.order);

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse(result);
});
