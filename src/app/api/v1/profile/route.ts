import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { updateProfile } from "@/app/[locale]/actions/profile";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/v1/profile
 * Get current user's profile
 */
export const GET = withAuth(async (request, { user }) => {
  console.log({ user });
  const profile = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    with: {
      subscription: {
        with: {
          plan: true,
        },
      },
    },
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  // Calculate isPremium: user has an active subscription with a paid plan
  const isPremium = !!(
    profile.subscription &&
    (profile.subscription.status === "active" ||
      profile.subscription.status === "trialing") &&
    (profile.subscription.plan.price > 0 ||
      profile.subscription.plan.stripePriceId !== null ||
      profile.subscription.plan.interval === "lifetime")
  );

  // Return profile with isPremium field, excluding subscription details
  const { subscription, ...profileData } = profile;

  console.log(JSON.stringify(subscription, null, 2));

  return createApiResponse({
    ...profileData,
    isPremium,
    planName: subscription?.plan.name ?? null,
  });
});

/**
 * PUT /api/v1/profile
 * Update current user's profile
 * Body: { username: string, bio: string, displayName?: string, profilePictureUrl?: string }
 */
export const PUT = withAuth(async (request, { user }) => {
  const body = await request.json();
  const { username, bio, displayName, profilePictureUrl } = body;

  if (!username) {
    throw new Error("Missing required field: username");
  }

  const result = await updateProfile(
    username,
    bio || "",
    displayName,
    profilePictureUrl
  );

  if (result.error) {
    throw new Error(result.error);
  }

  return createApiResponse(result);
});
