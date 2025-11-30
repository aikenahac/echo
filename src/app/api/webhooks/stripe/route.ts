import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { users, userSubscriptions, subscriptionPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  sendWelcomeToPremiumEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
} from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
} as Stripe.StripeConfig);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Force this route to be dynamic and disable caching
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || "";

  // Try to get userId from subscription metadata first
  let userId = subscription.metadata.userId;

  // If no userId in metadata, look it up by customer ID
  if (!userId) {
    console.log("No userId in subscription metadata, looking up by customerId:", customerId);
    const user = await db.query.users.findFirst({
      where: eq(users.stripeCustomerId, customerId),
    });

    if (!user) {
      console.error("No user found for Stripe customer:", customerId);
      return;
    }

    userId = user.id;
    console.log("Found userId from customer lookup:", userId);
  }

  // Find the plan by Stripe price ID
  const priceId = subscription.items.data[0].price.id;
  console.log("Looking up plan for priceId:", priceId);

  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.stripePriceId, priceId),
  });

  if (!plan) {
    console.error("No plan found for price ID:", priceId);
    console.error("Available plans:", await db.query.subscriptionPlans.findMany());
    return;
  }

  console.log("Found plan:", plan.name);

  const isPremium =
    subscription.status === "active" || subscription.status === "trialing";

  // Get user's existing premium status
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  const wasAlreadyPremium = user?.isPremium || false;

  // Upsert subscription
  const existingSubscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId),
  });

  if (existingSubscription) {
    await db
      .update(userSubscriptions)
      .set({
        planId: plan.id,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        status: subscription.status as "active" | "canceled" | "past_due" | "unpaid" | "trialing" | "incomplete",
        currentPeriodStart: "current_period_start" in subscription && typeof subscription.current_period_start === "number"
          ? new Date(subscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: "current_period_end" in subscription && typeof subscription.current_period_end === "number"
          ? new Date(subscription.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: "cancel_at_period_end" in subscription ? Boolean(subscription.cancel_at_period_end) : false,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.userId, userId));
  } else {
    await db.insert(userSubscriptions).values({
      userId,
      planId: plan.id,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      status: subscription.status as "active" | "canceled" | "past_due" | "unpaid" | "trialing" | "incomplete",
      currentPeriodStart: "current_period_start" in subscription && typeof subscription.current_period_start === "number"
        ? new Date(subscription.current_period_start * 1000)
        : null,
      currentPeriodEnd: "current_period_end" in subscription && typeof subscription.current_period_end === "number"
        ? new Date(subscription.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: "cancel_at_period_end" in subscription ? Boolean(subscription.cancel_at_period_end) : false,
    });
  }

  // Update user premium status
  await db
    .update(users)
    .set({
      isPremium,
      premiumSince: isPremium ? new Date() : null,
      stripeCustomerId: customerId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  console.log("✅ Subscription synced successfully for user:", userId, "- Plan:", plan.name, "- Status:", subscription.status);

  // Send welcome email for new premium users
  if (isPremium && !wasAlreadyPremium && user) {
    try {
      await sendWelcomeToPremiumEmail(user.email, user.username || "there");
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) return;

  // Get subscription details before deletion
  const userSub = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId),
  });

  // Update subscription to canceled
  await db
    .update(userSubscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.userId, userId));

  // Downgrade user to free tier
  const freePlan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.interval, "free"),
  });

  if (freePlan) {
    await db
      .update(userSubscriptions)
      .set({ planId: freePlan.id })
      .where(eq(userSubscriptions.userId, userId));
  }

  // Update user premium status
  await db
    .update(users)
    .set({
      isPremium: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Send cancellation email
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user && userSub?.currentPeriodEnd) {
    try {
      await sendSubscriptionCanceledEmail(
        user.email,
        user.username || "there",
        userSub.currentPeriodEnd,
      );
    } catch (emailError) {
      console.error("Failed to send cancellation email:", emailError);
    }
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Update subscription status if needed
  if ("subscription" in invoice && typeof invoice.subscription === "string") {
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription,
    );
    await handleSubscriptionUpdate(subscription);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || "";

  // Find user by customer ID
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  });

  if (!user) return;

  // Update subscription status to past_due
  await db
    .update(userSubscriptions)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.userId, user.id));

  // Send payment failed email
  try {
    await sendPaymentFailedEmail(user.email, user.username || "there");
  } catch (emailError) {
    console.error("Failed to send payment failed email:", emailError);
  }
}
