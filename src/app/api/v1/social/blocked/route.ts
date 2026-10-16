import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { listBlockedUsers } from "@/app/[locale]/actions/blocks";

/**
 * GET /api/v1/social/blocked
 * Users the caller has blocked, newest first
 */
export const GET = withAuth(async (request, { user }) => {
  const result = await listBlockedUsers(user.id);

  return createApiResponse({ users: result.users });
});
