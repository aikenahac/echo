import { withAuth, ApiError, actionError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { updateProfileFields } from "@/app/[locale]/actions/profile";
import { db } from "@/db";
import { users, userSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";

/**
 * GET /api/v1/profile
 * Get current user's profile
 */
export const GET = withAuth(async (request, { user }) => {
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
    throw new ApiError("Profile not found", 404);
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

  return createApiResponse({
    ...profileData,
    isPremium,
    planName: subscription?.plan.name ?? null,
  });
});

/**
 * PUT /api/v1/profile
 * Partially update current user's profile. Only fields present in the body
 * change; null or "" clears a field (except username, which can't be cleared).
 * Body: { username?, bio?, displayName?, profilePictureUrl? }
 */
export const PUT = withAuth(async (request) => {
  const body = await request.json();

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError("Invalid request body");
  }

  const { username, bio, displayName, profilePictureUrl } = body;

  const result = await updateProfileFields({
    username,
    bio,
    displayName,
    profilePictureUrl,
  });

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse(result);
});

/**
 * DELETE /api/v1/profile
 * Permanently delete the current user's account: cancels any running Stripe
 * subscription, deletes the user row (cascades to library, reviews, follows,
 * collections and subscription), then deletes the Clerk user.
 * Required for in-app account deletion (App Store guideline 5.1.1(v)).
 */
export const DELETE = withAuth(async (request, { user }) => {
  const subscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, user.id),
  });

  if (
    subscription?.stripeSubscriptionId &&
    ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(
      subscription.status,
    )
  ) {
    try {
      await getStripe().subscriptions.cancel(subscription.stripeSubscriptionId);
    } catch (error) {
      console.error(
        "Error cancelling subscription on account deletion:",
        error,
      );
      throw new ApiError("Could not cancel your subscription. Try again.", 500);
    }
  }

  // Delete the data first: if the Clerk call then fails, the client is still
  // signed in and can retry (the next request re-provisions an empty row).
  await db.delete(users).where(eq(users.id, user.id));

  const client = await clerkClient();
  await client.users.deleteUser(user.id);

  return createApiResponse({ success: true });
});
