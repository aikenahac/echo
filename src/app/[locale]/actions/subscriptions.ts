"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  users,
  userSubscriptions,
  subscriptionPlans,
  subscriptionUsage,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import {
  sendLimitReachedEmail,
  sendLimitWarningEmail,
} from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
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

    if (!plan || !plan.stripePriceId) {
      return { error: "Invalid plan" };
    }

    // Ensure user has Stripe customer ID
    let customerId = user?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email,
        metadata: { userId },
      });
      customerId = customer.id;

      await db
        .update(users)
        .set({ stripeCustomerId: customerId })
        .where(eq(users.id, userId));
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
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.stripeCustomerId) {
      return { error: "No Stripe customer found" };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
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
 * Get user's current usage stats
 */
export async function getUserUsageStats() {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) return { error: "User not found" };

    // Calculate current period based on subscription anniversary
    const now = new Date();
    const anniversary = user.subscriptionAnniversary || user.createdAt;
    const periodStart = calculatePeriodStart(anniversary, now);
    const periodEnd = calculatePeriodEnd(periodStart);

    // Get or create usage record
    let usage = await db.query.subscriptionUsage.findFirst({
      where: and(
        eq(subscriptionUsage.userId, userId),
        eq(subscriptionUsage.periodStart, periodStart),
      ),
    });

    if (!usage) {
      [usage] = await db
        .insert(subscriptionUsage)
        .values({
          userId,
          periodStart,
          periodEnd,
          booksAdded: 0,
        })
        .returning();
    }

    // Get subscription to determine limits
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
      with: { plan: true },
    });

    const features = subscription?.plan.features
      ? JSON.parse(subscription.plan.features)
      : { maxBooksPerYear: 50 };

    const limit = features.maxBooksPerYear; // null = unlimited

    return {
      booksAdded: usage.booksAdded,
      limit,
      periodStart,
      periodEnd,
      hasUnlimited: limit === null,
    };
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    return { error: "Failed to fetch usage stats" };
  }
}

/**
 * Check if user can add more books
 */
export async function canAddBook(): Promise<{
  allowed: boolean;
  reason?: string;
  usage?: any;
}> {
  const { userId } = await auth();
  if (!userId) return { allowed: false, reason: "Unauthorized" };

  const usageResult = await getUserUsageStats();
  if ("error" in usageResult) {
    return { allowed: false, reason: usageResult.error };
  }

  const { booksAdded, limit, hasUnlimited } = usageResult;

  if (hasUnlimited) {
    return { allowed: true, usage: usageResult };
  }

  if (limit !== null && booksAdded >= limit) {
    return {
      allowed: false,
      reason: `You've reached your limit of ${limit} books this year. Upgrade to Premium for unlimited books!`,
      usage: usageResult,
    };
  }

  return { allowed: true, usage: usageResult };
}

/**
 * Increment book usage counter
 */
export async function incrementBookUsage() {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) return { error: "User not found" };

    const now = new Date();
    const anniversary = user.subscriptionAnniversary || user.createdAt;
    const periodStart = calculatePeriodStart(anniversary, now);

    await db
      .update(subscriptionUsage)
      .set({
        booksAdded: sql`${subscriptionUsage.booksAdded} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptionUsage.userId, userId),
          eq(subscriptionUsage.periodStart, periodStart),
        ),
      );

    // Get updated usage for email notifications
    const usageResult = await getUserUsageStats();
    if ("error" in usageResult) {
      return { success: true }; // Continue even if email fails
    }

    const { booksAdded, limit } = usageResult;

    // Send email notifications at specific thresholds
    if (limit === 50) {
      // Warning at 40 books (80%)
      if (booksAdded === 40) {
        try {
          await sendLimitWarningEmail(user.email, user.username || "there", 40);
        } catch (emailError) {
          console.error("Failed to send limit warning email:", emailError);
        }
      }

      // Final warning at 48 books (96%)
      if (booksAdded === 48) {
        try {
          await sendLimitWarningEmail(user.email, user.username || "there", 48);
        } catch (emailError) {
          console.error("Failed to send limit warning email:", emailError);
        }
      }

      // Limit reached email
      if (booksAdded === 50) {
        try {
          await sendLimitReachedEmail(user.email, user.username || "there");
        } catch (emailError) {
          console.error("Failed to send limit reached email:", emailError);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error incrementing book usage:", error);
    return { error: "Failed to update usage" };
  }
}

/**
 * Get all active subscription plans for display
 */
export async function getActivePlans() {
  try {
    const plans = await db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.isActive, true),
      orderBy: (plans, { asc }) => [asc(plans.sortOrder)],
    });

    return { plans };
  } catch (error) {
    console.error("Error fetching plans:", error);
    return { error: "Failed to fetch plans" };
  }
}

// Helper functions
function calculatePeriodStart(anniversary: Date, now: Date): Date {
  const periodStart = new Date(anniversary);
  periodStart.setFullYear(now.getFullYear());

  // If anniversary hasn't occurred this year, use last year
  if (periodStart > now) {
    periodStart.setFullYear(now.getFullYear() - 1);
  }

  return periodStart;
}

function calculatePeriodEnd(periodStart: Date): Date {
  const periodEnd = new Date(periodStart);
  periodEnd.setFullYear(periodStart.getFullYear() + 1);
  periodEnd.setDate(periodEnd.getDate() - 1); // Day before anniversary
  return periodEnd;
}
