import { withAuth, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { discordAuthorizeUrl, isDiscordLinkingConfigured, unlinkDiscord } from "@/lib/discord";

/**
 * POST /api/v1/discord
 * Start linking a Discord account from the app: returns the consent page URL
 * to open in an auth session; it redirects back to echo://settings?discord=…
 */
export const POST = withAuth(async (_request, { user }) => {
  if (!isDiscordLinkingConfigured()) {
    throw new ApiError("Discord linking is not available", 503);
  }
  return createApiResponse({ url: discordAuthorizeUrl(user.id, "app") });
});

/**
 * DELETE /api/v1/discord
 * Unlink the Discord account and remove the roles Echo gave it.
 */
export const DELETE = withAuth(async (_request, { user }) => {
  await unlinkDiscord(user.id);
  return createApiResponse({ success: true });
});
