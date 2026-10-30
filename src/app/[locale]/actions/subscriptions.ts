"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, userSubscriptions, subscriptionPlans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidateLocalized } from "@/lib/revalidate";
import { isPaidPlan } from "@/lib/plans";
import {
  getLemonSqueezy,
  lemonSqueezyStoreId,
  lemonSqueezyTestMode,
  isLemonSqueezyConfigured,
} from "@/lib/lemonsqueezy";

// Free plans never expire; use a far-future period end
const farFuture = () =>
  new Date(new Date().setFullYear(new Date().getFullYear() + 100));

/**
 * Create a Lemon Squeezy checkout for a subscription upgrade
 */
export async function createCheckoutSession(planId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  if (!isLemonSqueezyConfigured()) {
    return { error: "Payments are coming soon" };
  }

  try {
    const [user, plan, current] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, userId),
      }),
      db.query.subscriptionPlans.findFirst({
        where: and(
          eq(subscriptionPlans.id, planId),
          eq(subscriptionPlans.isActive, true)
        ),
      }),
      db.query.userSubscriptions.findFirst({
        where: eq(userSubscriptions.userId, userId),
        with: { plan: true },
      }),
    ]);

    // Prevents paying twice, e.g. a lifetime purchase on top of a subscription
    if (
      current &&
      ["active", "trialing"].includes(current.status) &&
      isPaidPlan(current.plan)
    ) {
      return { error: "You already have Premium" };
    }

    if (!plan) {
      return { error: "Plan not found" };
    }

    if (!plan.lemonSqueezyVariantId) {
      return { error: "This plan does not require checkout" };
    }

    // The user ID travels as custom data and comes back on every webhook
    const checkout = await getLemonSqueezy().createCheckout({
      storeId: lemonSqueezyStoreId(),
      variantId: plan.lemonSqueezyVariantId,
      testMode: lemonSqueezyTestMode(),
      productOptions: {
        redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/success`,
        enabledVariants: [Number(plan.lemonSqueezyVariantId)],
      },
      checkoutData: {
        ...(user?.email ? { email: user.email } : {}),
        custom: { user_id: userId },
      },
    });

    return { url: checkout.url };
  } catch (error) {
    console.error("Error creating checkout:", error);
    return { error: "Failed to create checkout session" };
  }
}

/**
 * Get the Lemon Squeezy customer portal URL for the current subscription
 */
export async function createPortalSession() {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  try {
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
    });

    if (subscription?.source !== "lemonsqueezy" || !subscription.lemonSqueezySubscriptionId) {
      return { error: "No subscription found" };
    }

    const { urls } = await getLemonSqueezy().getSubscription(
      subscription.lemonSqueezySubscriptionId,
    );

    if (!urls.customerPortal) {
      return { error: "Billing portal is unavailable" };
    }

    return { url: urls.customerPortal };
  } catch (error) {
    console.error("Error fetching billing portal:", error);
    return { error: "Failed to open billing portal" };
  }
}

/**
 * Get current user's subscription details
 */
export async function getUserSubscription() {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  try {
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
      with: {
        plan: true,
      },
    });

    return { subscription };
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return { error: "Failed to fetch subscription" };
  }
}


/**
 * Check if user can add more books
 */

/**
 * Increment book usage counter
 */

/**
 * Get all active subscription plans for display (excluding internal plans)
 */
export async function getActivePlans() {
  try {
    const plans = await db.query.subscriptionPlans.findMany({
      where: and(
        eq(subscriptionPlans.isActive, true),
        eq(subscriptionPlans.isInternal, false)
      ),
      orderBy: (plans, { asc }) => [asc(plans.sortOrder)],
    });

    return { plans };
  } catch (error) {
    console.error("Error fetching plans:", error);
    return { error: "Failed to fetch plans" };
  }
}

/**
 * Upgrade user to a free plan (no checkout required)
 */
export async function upgradeToFreePlan(planId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  try {
    // Get the plan
    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId),
    });

    if (!plan) {
      return { error: "Plan not found" };
    }

    // Only public, active, genuinely free plans can be self-assigned.
    // Internal or lifetime plans without a Lemon Squeezy variant must be granted by an admin.
    if (
      plan.lemonSqueezyVariantId ||
      plan.price !== 0 ||
      plan.interval !== "free" ||
      !plan.isActive ||
      plan.isInternal
    ) {
      return { error: "This plan requires payment" };
    }

    // Create or update the user's subscription
    await db
      .insert(userSubscriptions)
      .values({
        userId,
        planId: plan.id,
        source: "manual",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: farFuture(),
        cancelAtPeriodEnd: false,
      })
      .onConflictDoUpdate({
        target: userSubscriptions.userId,
        set: {
          planId: plan.id,
          source: "manual",
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: farFuture(),
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        },
      });

    revalidateLocalized("/subscription");
    return { success: true };
  } catch (error) {
    console.error("Error upgrading to free plan:", error);
    return { error: "Failed to upgrade plan" };
  }
}
