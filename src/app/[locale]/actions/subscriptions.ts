"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, userSubscriptions, subscriptionPlans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

/**
 * Create a Stripe Checkout session for subscription upgrade
 */
export async function createCheckoutSession(planId: string) {
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

    if (!plan.stripePriceId) {
      return { error: "This plan does not require checkout" };
    }

    // Get or create Stripe customer ID
    // Check if user has existing subscription with customer ID
    const existingSubscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
    });

    let customerId = existingSubscription?.stripeCustomerId;
    if (!customerId) {
      // Create new Stripe customer (will be saved to userSubscriptions by webhook)
      const customer = await stripe.customers.create({
        email: user?.email,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/canceled`,
      metadata: {
        userId,
        planId,
      },
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return { error: "Failed to create checkout session" };
  }
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession() {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  try {
    // Get user's subscription to find Stripe customer ID
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
    });

    if (!subscription?.stripeCustomerId) {
      return { error: "No Stripe customer found" };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription`,
    });

    return { url: session.url };
  } catch (error) {
    console.error("Error creating portal session:", error);
    return { error: "Failed to create portal session" };
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

    // Verify it's actually a free plan (no Stripe price ID)
    if (plan.stripePriceId) {
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
          features: JSON.stringify({}),
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
