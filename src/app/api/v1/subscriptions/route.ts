import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { userSubscriptions, subscriptionPlans } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/v1/subscriptions
 * Get user's current subscription and plan details
 */
export const GET = withAuth(async (request, { user }) => {
  const subscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, user.id),
    with: {
      plan: true,
    },
  });

  if (!subscription) {
    // Return free plan info
    const freePlan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.interval, "free"),
    });

    return createApiResponse({
      subscription: null,
      plan: freePlan,
      isActive: false,
      isFree: true,
    });
  }

  // Check if subscription is active
  const isActive =
    subscription.status === "active" ||
    subscription.status === "trialing";

  return createApiResponse({
    subscription: {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    },
    plan: subscription.plan,
    isActive,
    isFree: subscription.plan.price === 0,
  });
});
