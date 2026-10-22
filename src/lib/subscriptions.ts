import "server-only";
import { db } from "@/db";
import { userSubscriptions, subscriptionPlans } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getSubscriptionResponse(userId: string) {
  const subscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId),
    with: {
      plan: true,
    },
  });

  if (!subscription) {
    // Return free plan info
    const freePlan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.interval, "free"),
    });

    return {
      subscription: null,
      plan: freePlan,
      isActive: false,
      isFree: true,
    };
  }

  // Check if subscription is active
  const isActive =
    subscription.status === "active" ||
    subscription.status === "trialing";

  return {
    subscription: {
      id: subscription.id,
      source: subscription.source,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    },
    plan: subscription.plan,
    isActive,
    isFree: subscription.plan.price === 0,
  };
}
