"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, userSubscriptions, subscriptionPlans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidateLocalized } from "@/lib/revalidate";
import { getStripe } from "@/lib/stripe";

// Free plans never expire; use a far-future period end
const farFuture = () =>
  new Date(new Date().setFullYear(new Date().getFullYear() + 100));

/**
 * Create a Stripe Checkout session for subscription upgrade
 */
export async function createCheckoutSession(planId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  try {
    // Get user, plan and existing subscription (for the Stripe customer ID)
    const [user, plan, existingSubscription] = await Promise.all([
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
      }),
    ]);

    if (!plan) {
      return { error: "Plan not found" };
    }

    if (!plan.stripePriceId) {
      return { error: "This plan does not require checkout" };
    }

    const stripe = getStripe();

    // Reuse the user's Stripe customer if they have one
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

    const session = await getStripe().billingPortal.sessions.create({
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

    // Only public, active, genuinely free plans can be self-assigned.
    // Internal or lifetime plans without a Stripe price must be granted by an admin.
    if (
      plan.stripePriceId ||
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
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: farFuture(),
        cancelAtPeriodEnd: false,
      })
      .onConflictDoUpdate({
        target: userSubscriptions.userId,
        set: {
          planId: plan.id,
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
