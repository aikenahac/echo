import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import {
  users,
  userSubscriptions,
  subscriptionPlans,
  stripeEvents,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  sendWelcomeToPremiumEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
} from "@/lib/email";
import { getStripe } from "@/lib/stripe";
import { isPaidPlan } from "@/lib/auth";

// Force this route to be dynamic and disable caching
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "unpaid"
  | "trialing"
  | "incomplete";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Stripe may deliver the same event more than once: process each event once
  const [newEvent] = await db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning();

  if (!newEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Error processing webhook:", err);
    // Forget the event so Stripe's retry gets processed
    await db.delete(stripeEvents).where(eq(stripeEvents.id, event.id));
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

const idOf = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : value?.id ?? null;

/**
 * Find our subscription row for a Stripe subscription: by metadata user ID,
 * then by Stripe subscription ID, then by Stripe customer ID.
 */
async function findSubscriptionRow(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  if (userId) {
    const row = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
      with: { plan: true },
    });
    return { userId, row };
  }

  const bySubscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.stripeSubscriptionId, subscription.id),
    with: { plan: true },
  });
  if (bySubscription) return { userId: bySubscription.userId, row: bySubscription };

  const customerId = idOf(subscription.customer);
  if (customerId) {
    const byCustomer = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.stripeCustomerId, customerId),
      with: { plan: true },
    });
    if (byCustomer) return { userId: byCustomer.userId, row: byCustomer };
  }

  return { userId: null, row: undefined };
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = idOf(subscription.customer);
  const { userId, row: existingSubscription } =
    await findSubscriptionRow(subscription);

  if (!userId) {
    console.error("No user found for Stripe subscription:", subscription.id);
    return;
  }

  const isActive =
    subscription.status === "active" || subscription.status === "trialing";

  // Ignore stale events from an older subscription that has been replaced
  if (
    existingSubscription?.stripeSubscriptionId &&
    existingSubscription.stripeSubscriptionId !== subscription.id &&
    !isActive
  ) {
    console.log("Ignoring event for replaced subscription:", subscription.id);
    return;
  }

  // Since API version 2025-03-31, billing periods live on subscription items
  const item = subscription.items.data[0];
  if (!item) {
    console.error("Subscription has no items:", subscription.id);
    return;
  }

  // Find the plan by Stripe price ID
  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.stripePriceId, item.price.id),
  });

  if (!plan) {
    console.error("No plan found for price ID:", item.price.id);
    return;
  }

  const values = {
    planId: plan.id,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    status: subscription.status as SubscriptionStatus,
    currentPeriodStart: new Date(item.current_period_start * 1000),
    currentPeriodEnd: new Date(item.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  await db
    .insert(userSubscriptions)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: userSubscriptions.userId,
      set: { ...values, updatedAt: new Date() },
    });

  console.log("Subscription synced for user:", userId, "- Plan:", plan.name, "- Status:", subscription.status);

  // Send welcome email when the user moves from a free plan to an active paid plan
  if (isActive && isPaidPlan(plan) && !isPaidPlan(existingSubscription?.plan)) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user?.email) {
      try {
        await sendWelcomeToPremiumEmail(user.email, user.username || "there");
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { userId, row: userSub } = await findSubscriptionRow(subscription);

  if (!userId || !userSub) return;

  // Ignore deletions of a subscription the user no longer has
  if (userSub.stripeSubscriptionId && userSub.stripeSubscriptionId !== subscription.id) {
    return;
  }

  // Cancel and downgrade the user to the free tier
  const freePlan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.interval, "free"),
  });

  await db
    .update(userSubscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
      ...(freePlan ? { planId: freePlan.id } : {}),
    })
    .where(eq(userSubscriptions.userId, userId));

  // Send cancellation email
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user?.email && userSub.currentPeriodEnd) {
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

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  return idOf(invoice.parent?.subscription_details?.subscription);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Re-sync the subscription (status, period) after a successful payment
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await handleSubscriptionUpdate(subscription);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  // Only mark the subscription the invoice belongs to as past due
  const subscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.stripeSubscriptionId, subscriptionId),
  });

  if (!subscription) return;

  await db
    .update(userSubscriptions)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.userId, subscription.userId));

  // Get user for email
  const user = await db.query.users.findFirst({
    where: eq(users.id, subscription.userId),
  });

  if (!user?.email) return;

  // Send payment failed email
  try {
    await sendPaymentFailedEmail(user.email, user.username || "there");
  } catch (emailError) {
    console.error("Failed to send payment failed email:", emailError);
  }
}
