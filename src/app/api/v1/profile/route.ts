import { withAuth, ApiError, actionError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { updateProfileFields } from "@/app/[locale]/actions/profile";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AccountDeletionError, deleteUserAccount } from "@/lib/account";
import { getFollowCounts } from "@/lib/visibility";

/**
 * GET /api/v1/profile
 * Get current user's profile, with follower and following counts
 */
export const GET = withAuth(async (request, { user }) => {
  const [profile, counts] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, user.id),
      with: {
        subscription: {
          with: {
            plan: true,
          },
        },
      },
    }),
    getFollowCounts(user.id),
  ]);

  if (!profile) {
    throw new ApiError("Profile not found", 404);
  }

  // Calculate isPremium: user has an active subscription with a paid plan
  const isPremium = !!(
    profile.subscription &&
    (profile.subscription.status === "active" ||
      profile.subscription.status === "trialing") &&
    (profile.subscription.plan.price > 0 ||
      profile.subscription.plan.lemonSqueezyVariantId !== null ||
      profile.subscription.plan.interval === "lifetime")
  );

  // Return profile with isPremium field, excluding subscription details
  const { subscription, ...profileData } = profile;

  return createApiResponse({
    ...profileData,
    isPremium,
    planName: subscription?.plan.name ?? null,
    ...counts,
  });
});

/**
 * PUT /api/v1/profile
 * Partially update current user's profile. Only fields present in the body
 * change; null or "" clears a field (except username, which can't be cleared).
 * Body: { username?, bio?, displayName?, profilePictureUrl?,
 *   profileVisibility?, activityVisibility?, reviewVisibility? }
 * The visibility fields take "public" | "followers" | "friends" | "private".
 */
export const PUT = withAuth(async (request) => {
  const body = await request.json();

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError("Invalid request body");
  }

  const {
    username,
    bio,
    displayName,
    profilePictureUrl,
    profileVisibility,
    activityVisibility,
    reviewVisibility,
  } = body;

  const result = await updateProfileFields({
    username,
    bio,
    displayName,
    profilePictureUrl,
    profileVisibility,
    activityVisibility,
    reviewVisibility,
  });

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse(result);
});

/**
 * DELETE /api/v1/profile
 * Permanently delete the current user's account: cancels any running Lemon Squeezy
 * subscription, deletes the user row (cascades to library, reviews, follows,
 * collections and subscription), then deletes the Clerk user.
 * Required for in-app account deletion (App Store guideline 5.1.1(v)).
 */
export const DELETE = withAuth(async (request, { user }) => {
  try {
    await deleteUserAccount(user.id);
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      throw new ApiError(error.message, 500);
    }
    throw error;
  }

  return createApiResponse({ success: true });
});
