import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  LemonSqueezyWebhookError,
  parseWebhookEvent,
  type LemonSqueezySubscription,
  type WebhookCustomData,
} from "@avarra/lemonsqueezy";
import { db } from "@/db";
import {
  users,
  userSubscriptions,
  subscriptionPlans,
  webhookEvents,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  sendWelcomeToPremiumEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
} from "@/lib/email";
import {
  getLemonSqueezy,
  parseOrder,
  type LemonSqueezyOrder,
} from "@/lib/lemonsqueezy";
import { isPaidPlan } from "@/lib/auth";

// Force this route to be dynamic and disable caching
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "unpaid"
  | "trialing"
  | "incomplete";

/**
 * Map Lemon Squeezy's status onto ours. A "cancelled" subscription is still
 * usable until it ends, so it stays active with `cancelAtPeriodEnd` set; a
 * paused one is not premium.
 */
function mapStatus(status: LemonSqueezySubscription["status"]): SubscriptionStatus {
  switch (status) {
    case "on_trial":
      return "trialing";
    case "active":
    case "cancelled":
      return "active";
    case "past_due":
      return "past_due";
    case "unpaid":
    case "paused":
      return "unpaid";
    case "expired":
      return "canceled";
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  let event;
  try {
    event = await parseWebhookEvent({
      rawBody: body,
      signature: req.headers.get("x-signature") ?? "",
      secret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!,
    });
  } catch (err) {
    if (err instanceof LemonSqueezyWebhookError) {
      console.error("Webhook rejected:", err.message);
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
    }
    throw err;
  }

  // Lemon Squeezy events have no ID, and a retry resends the identical body:
  // process each distinct body once
  const eventId = createHash("sha256").update(body).digest("hex");
  const [newEvent] = await db
    .insert(webhookEvents)
    .values({ id: eventId, type: event.eventName })
    .onConflictDoNothing()
    .returning();

  if (!newEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.kind) {
      case "subscription":
        if (event.eventName === "subscription_expired") {
          await handleSubscriptionExpired(event.data, event.customData);
        } else {
          await handleSubscriptionUpdate(event.data, event.customData);
        }
        break;

      case "subscription_invoice":
        switch (event.eventName) {
          case "subscription_payment_success":
          case "subscription_payment_recovered": {
            // Re-sync the subscription (status, renewal date) after a payment
            const subscription = await getLemonSqueezy().getSubscription(
              event.data.subscriptionId,
            );
            await handleSubscriptionUpdate(subscription, event.customData);
            break;
          }
          case "subscription_payment_failed":
            await handlePaymentFailed(event.data.subscriptionId);
            break;
          case "subscription_payment_refunded":
            console.log(`Unhandled event type: ${event.eventName}`);
            break;
        }
        break;

      case "unknown":
        switch (event.eventName) {
          case "order_created":
            await handleOrderCreated(parseOrder(event.data), event.customData);
            break;
          case "order_refunded":
            await handleOrderRefunded(parseOrder(event.data), event.customData);
            break;
          default:
            console.log(`Unhandled event type: ${event.eventName}`);
        }
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Error processing webhook:", err);
    // Forget the event so Lemon Squeezy's retry gets processed
    await db.delete(webhookEvents).where(eq(webhookEvents.id, eventId));
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

/**
 * Find our subscription row for a Lemon Squeezy subscription: by the user ID
 * passed as checkout custom data, then by subscription ID, then by customer ID.
 */
async function findSubscriptionRow(
  subscription: LemonSqueezySubscription,
  customData: WebhookCustomData,
) {
  const userId = customUserId(customData);
  if (userId) {
    const row = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
      with: { plan: true },
    });
    return { userId, row };
  }

  const bySubscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.lemonSqueezySubscriptionId, subscription.id),
    with: { plan: true },
  });
  if (bySubscription) return { userId: bySubscription.userId, row: bySubscription };

  const byCustomer = await db.query.userSubscriptions.findFirst({
    where: eq(
      userSubscriptions.lemonSqueezyCustomerId,
      String(subscription.customerId),
    ),
    with: { plan: true },
  });
  if (byCustomer) return { userId: byCustomer.userId, row: byCustomer };

  return { userId: null, row: undefined };
}

async function handleSubscriptionUpdate(
  subscription: LemonSqueezySubscription,
  customData: WebhookCustomData,
) {
  const { userId, row: existingSubscription } = await findSubscriptionRow(
    subscription,
    customData,
  );

  if (!userId) {
    console.error("No user found for subscription:", subscription.id);
    return;
  }

  const status = mapStatus(subscription.status);
  const isActive = status === "active" || status === "trialing";
  const isNewSubscription =
    existingSubscription?.lemonSqueezySubscriptionId !== subscription.id;

  // A replaced web subscription must not overwrite active store, manual or
  // lifetime access. A promo grant gives way to a real purchase.
  if (
    existingSubscription &&
    existingSubscription.source !== "promo" &&
    (existingSubscription.source !== "lemonsqueezy" ||
      existingSubscription.plan.interval === "lifetime") &&
    ["active", "trialing"].includes(existingSubscription.status) &&
    isPaidPlan(existingSubscription.plan)
  ) return;

  // Ignore stale events from an older subscription that has been replaced
  if (
    existingSubscription?.lemonSqueezySubscriptionId &&
    isNewSubscription &&
    !isActive
  ) {
    console.log("Ignoring event for replaced subscription:", subscription.id);
    return;
  }

  // Find the plan by Lemon Squeezy variant ID
  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(
      subscriptionPlans.lemonSqueezyVariantId,
      String(subscription.variantId),
    ),
  });

  if (!plan) {
    console.error("No plan found for variant ID:", subscription.variantId);
    return;
  }

  const periodEnd = subscription.endsAt ?? subscription.renewsAt;
  const values: typeof userSubscriptions.$inferInsert = {
    userId,
    planId: plan.id,
    source: "lemonsqueezy",
    storeProductId: null,
    lemonSqueezySubscriptionId: subscription.id,
    lemonSqueezyCustomerId: String(subscription.customerId),
    status,
    currentPeriodStart: isNewSubscription
      ? new Date(subscription.createdAt)
      : existingSubscription.currentPeriodStart,
    currentPeriodEnd: periodEnd ? new Date(periodEnd) : null,
    cancelAtPeriodEnd: subscription.cancelled && status !== "canceled",
    canceledAt: null,
  };

  await db
    .insert(userSubscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: userSubscriptions.userId,
      set: { ...values, updatedAt: new Date() },
    });

  console.log("Subscription synced for user:", userId, "- Plan:", plan.name, "- Status:", subscription.status);

  // Send welcome email when the user moves from a free plan to an active paid plan
  if (isActive && isPaidPlan(plan) && !hadPaidAccess(existingSubscription)) {
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

async function handleSubscriptionExpired(
  subscription: LemonSqueezySubscription,
  customData: WebhookCustomData,
) {
  const { userId, row: userSub } = await findSubscriptionRow(
    subscription,
    customData,
  );

  if (
    !userId ||
    !userSub ||
    userSub.source !== "lemonsqueezy" ||
    userSub.plan.interval === "lifetime"
  ) {
    return;
  }

  // Ignore expiry of a subscription the user no longer has
  if (
    userSub.lemonSqueezySubscriptionId &&
    userSub.lemonSqueezySubscriptionId !== subscription.id
  ) {
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
      cancelAtPeriodEnd: false,
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

/** The user ID passed as checkout custom data, if any. */
/** Paid access before this event; a promo grant doesn't count, so buying after one still welcomes the user */
function hadPaidAccess(row: { source: string; plan: Parameters<typeof isPaidPlan>[0] } | undefined) {
  return !!row && row.source !== "promo" && isPaidPlan(row.plan);
}

function customUserId(customData: WebhookCustomData) {
  const userId = customData.user_id;
  return typeof userId === "string" ? userId : undefined;
}

/** Find the lifetime plan sold by a one-time variant; subscriptions are handled elsewhere. */
function findLifetimePlan(variantId: number) {
  return db.query.subscriptionPlans.findFirst({
    where: and(
      eq(subscriptionPlans.lemonSqueezyVariantId, String(variantId)),
      eq(subscriptionPlans.interval, "lifetime"),
    ),
  });
}

/** A paid one-time order for a lifetime plan grants it for good. */
async function handleOrderCreated(
  order: LemonSqueezyOrder,
  customData: WebhookCustomData,
) {
  if (order.status !== "paid") return;

  // order_created also fires for a subscription's first payment
  const plan = await findLifetimePlan(order.variantId);
  if (!plan) return;

  const userId = customUserId(customData);
  if (!userId) {
    console.error("No user ID on lifetime order:", order.id);
    return;
  }

  const existing = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId),
    with: { plan: true },
  });

  const values: typeof userSubscriptions.$inferInsert = {
    userId,
    planId: plan.id,
    source: "lemonsqueezy",
    storeProductId: null,
    lemonSqueezySubscriptionId: null,
    lemonSqueezyCustomerId: String(order.customerId),
    status: "active",
    currentPeriodStart: new Date(order.createdAt),
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
  };

  await db
    .insert(userSubscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: userSubscriptions.userId,
      set: { ...values, updatedAt: new Date() },
    });

  console.log("Lifetime plan granted to user:", userId, "- Order:", order.id);

  if (existing && hadPaidAccess(existing) && ["active", "trialing"].includes(existing.status)) {
    return;
  }

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

/** A fully refunded lifetime order takes the user back to the free plan. */
async function handleOrderRefunded(
  order: LemonSqueezyOrder,
  customData: WebhookCustomData,
) {
  if (order.status !== "refunded") return;

  const userId = customUserId(customData);
  if (!userId) return;

  const userSub = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId),
    with: { plan: true },
  });

  // Only revoke the lifetime plan this order bought
  if (
    userSub?.source !== "lemonsqueezy" ||
    userSub.plan.interval !== "lifetime" ||
    userSub.plan.lemonSqueezyVariantId !== String(order.variantId)
  ) {
    return;
  }

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

  console.log("Lifetime plan revoked after refund for user:", userId);
}

async function handlePaymentFailed(subscriptionId: number) {
  // Only mark the subscription the invoice belongs to as past due
  const subscription = await db.query.userSubscriptions.findFirst({
    where: eq(
      userSubscriptions.lemonSqueezySubscriptionId,
      String(subscriptionId),
    ),
  });

  if (!subscription || subscription.source !== "lemonsqueezy") return;

  await db
    .update(userSubscriptions)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.userId, subscription.userId));

  const user = await db.query.users.findFirst({
    where: eq(users.id, subscription.userId),
  });

  if (!user?.email) return;

  try {
    await sendPaymentFailedEmail(user.email, user.username || "there");
  } catch (emailError) {
    console.error("Failed to send payment failed email:", emailError);
  }
}
