import { withAuth, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { usernameFormatError } from "@/lib/username";

/**
 * GET /api/v1/profile/username-available?username=
 * Check whether a username can be set by the current user (same rules as
 * PUT /profile; the caller's own current username counts as available)
 */
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    throw new ApiError("Missing required query parameter: username");
  }

  const formatError = usernameFormatError(username);
  if (formatError) {
    return createApiResponse({ available: false, reason: formatError });
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
    columns: { id: true },
  });

  if (existing && existing.id !== user.id) {
    return createApiResponse({ available: false, reason: "Username already taken" });
  }

  return createApiResponse({ available: true });
});
