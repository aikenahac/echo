"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, userSubscriptions, subscriptionPlans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";

const paddle = new Paddle(process.env.PADDLE_API_KEY!, {
  environment:
    process.env.PADDLE_ENVIRONMENT === "production"
      ? Environment.production
      : Environment.sandbox,
});

/**
 * Create a Paddle Checkout transaction for subscription upgrade
 */
export async function createPaddleCheckout(planId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  try {
    // Get user and plan
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId),
    });

    if (!plan) {
      return { error: "Plan not found" };
    }

    if (!plan.paddlePriceId) {
      return { error: "This plan does not require checkout" };
    }

    // Get or create Paddle customer
    const existingSubscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
    });

    let customerId = existingSubscription?.paddleCustomerId;
    if (!customerId) {
      try {
        // Try to create new Paddle customer
        const customer = await paddle.customers.create({
          email: user?.email ?? "",
          customData: { userId },
        });
        customerId = customer.id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (customerError: any) {
        // If customer already exists, extract customer ID from error message
        if (customerError.code === "customer_already_exists") {
          console.log("Customer already exists, extracting ID from error");
          // Error message format: "customer email conflicts with customer of id ctm_xxx"
          const match = customerError.detail?.match(/customer of id (ctm_[a-z0-9]+)/i);
          if (match && match[1]) {
            customerId = match[1];
            console.log("Using existing customer ID from error:", customerId);
          } else {
            console.error("Could not extract customer ID from error:", customerError.detail);
            return { error: "Customer already exists but ID could not be determined" };
          }
        } else {
          throw customerError;
        }
      }
    }

    if (!customerId) {
      return { error: "Failed to get or create customer" };
    }

    // Create checkout transaction
    const transaction = await paddle.transactions.create({
      items: [{ priceId: plan.paddlePriceId, quantity: 1 }],
      customerId,
      customData: { userId, planId },
    });

    return {
      transactionId: transaction.id,
      checkoutUrl: transaction.checkout?.url,
    };
  } catch (error) {
    console.error("Error creating Paddle checkout:", error);
    return { error: "Failed to create checkout" };
  }
}

/**
 * Cancel subscription (replaces Stripe Customer Portal)
 */
export async function cancelSubscription() {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  try {
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
    });

    if (!subscription?.paddleSubscriptionId) {
      return { error: "No subscription found" };
    }

    await paddle.subscriptions.cancel(subscription.paddleSubscriptionId, {
      effectiveFrom: "next_billing_period",
    });

    revalidatePath("/subscription");
    return { success: true };
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return { error: "Failed to cancel subscription" };
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

    // Verify it's actually a free plan (no Paddle price ID)
    if (plan.paddlePriceId) {
      return { error: "This plan requires payment" };
    }

    // Check if user already has a subscription
    const existingSubscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
      with: { plan: true },
    });

    if (existingSubscription) {
      // Update existing subscription
      await db
        .update(userSubscriptions)
        .set({
          planId: plan.id,
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 100)),
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.userId, userId));
    } else {
      // Create new subscription
      await db.insert(userSubscriptions).values({
        userId,
        planId: plan.id,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 100)),
        cancelAtPeriodEnd: false,
      });
    }

    revalidatePath("/subscription");
    return { success: true };
  } catch (error) {
    console.error("Error upgrading to free plan:", error);
    return { error: "Failed to upgrade plan" };
  }
}

/**
 * Get the free plan (or create it if it doesn't exist)
 * Finds plans by interval type "free", not by price
 */
export async function getOrCreateFreePlan() {
  try {
    // Try to find existing free plan by interval type
    let freePlan = await db.query.subscriptionPlans.findFirst({
      where: and(
        eq(subscriptionPlans.interval, "free"),
        eq(subscriptionPlans.isActive, true)
      ),
      orderBy: (plans, { asc }) => [asc(plans.sortOrder)],
    });

    // Create free plan if it doesn't exist
    if (!freePlan) {
      [freePlan] = await db
        .insert(subscriptionPlans)
        .values({
          name: "Free",
          price: 0,
          interval: "free",
          isActive: true,
          isInternal: false,
          sortOrder: 0,
        })
        .returning();
    }

    return { plan: freePlan };
  } catch (error) {
    console.error("Error getting/creating free plan:", error);
    return { error: "Failed to get free plan" };
  }
}

/**
 * Assign free plan to a user
 */
export async function assignFreePlanToUser(userId: string) {
  try {
    // Check if user already has a subscription
    const existingSubscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
    });

    if (existingSubscription) {
      return { subscription: existingSubscription };
    }

    // Get or create free plan
    const freePlanResult = await getOrCreateFreePlan();
    if ("error" in freePlanResult || !freePlanResult.plan) {
      return { error: "Failed to get free plan" };
    }

    // Create subscription for user
    const [subscription] = await db
      .insert(userSubscriptions)
      .values({
        userId,
        planId: freePlanResult.plan.id,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 100)), // Far future for free plan
        cancelAtPeriodEnd: false,
      })
      .returning();

    return { subscription };
  } catch (error) {
    console.error("Error assigning free plan to user:", error);
    return { error: "Failed to assign free plan" };
  }
}

// Helper functions
// Period helpers removed — no longer used by subscription usage tracking.
