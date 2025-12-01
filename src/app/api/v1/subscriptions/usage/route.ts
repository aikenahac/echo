import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
// Usage API removed: usage tracking has been removed from the codebase

/**
 * GET /api/v1/subscriptions/usage
 * Get user's usage statistics for the current period
 */
export const GET = withAuth(async () => {
  return createApiResponse({ error: "Usage tracking removed" }, 410);
});
