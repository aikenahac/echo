import { NextRequest, NextResponse } from "next/server";
import { Paddle, EventName, Environment } from "@paddle/paddle-node-sdk";
import { db } from "@/db";
import { users, userSubscriptions, subscriptionPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  sendWelcomeToPremiumEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
} from "@/lib/email";

const paddle = new Paddle(process.env.PADDLE_API_KEY!, {
  environment:
    process.env.PADDLE_ENVIRONMENT === "production"
      ? Environment.production
      : Environment.sandbox,
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("paddle-signature");
    const rawBody = await req.text();

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // Verify webhook signature
    const secretKey = process.env.PADDLE_WEBHOOK_SECRET!;
    const eventData = paddle.webhooks.unmarshal(rawBody, secretKey, signature);

    const event = JSON.parse(rawBody);
    const eventType = event.event_type;

    console.log(`Paddle webhook: ${eventType}`);

    switch (eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
        await handleSubscriptionUpdate(event.data);
        break;
      case EventName.SubscriptionCanceled:
        await handleSubscriptionCanceled(event.data);
        break;
      case EventName.TransactionCompleted:
        await handleTransactionCompleted(event.data);
        break;
      case EventName.TransactionPaymentFailed:
        await handlePaymentFailed(event.data);
        break;
      default:
        console.log(`Unhandled: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Paddle webhook error:", err);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 },
    );
  }
}

async function handleSubscriptionUpdate(subscription: any) {
  const userId = subscription.custom_data?.userId;
  if (!userId) {
    console.error("No userId in subscription custom_data");
    return;
  }

  const priceId = subscription.items[0]?.price?.id;
  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.paddlePriceId, priceId),
  });

  if (!plan) {
    console.error("No plan found for price:", priceId);
    return;
  }

  // Parse Paddle timestamps (ISO 8601 strings)
  const billingPeriod = subscription.current_billing_period;
  const currentPeriodStart = billingPeriod?.starts_at
    ? new Date(billingPeriod.starts_at)
    : null;
  const currentPeriodEnd = billingPeriod?.ends_at
    ? new Date(billingPeriod.ends_at)
    : null;

  const existing = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId),
  });

  const subscriptionData = {
    planId: plan.id,
    paddleSubscriptionId: subscription.id,
    paddleCustomerId: subscription.customer_id,
    status: subscription.status as any,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.scheduled_change?.action === "cancel",
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(userSubscriptions)
      .set(subscriptionData)
      .where(eq(userSubscriptions.userId, userId));
  } else {
    await db.insert(userSubscriptions).values({
      userId,
      ...subscriptionData,
    });
  }

  console.log(
    "✅ Subscription synced successfully for user:",
    userId,
    "- Plan:",
    plan.name,
    "- Status:",
    subscription.status,
  );

  // Send welcome email for new premium subscriptions
  if (
    (subscription.status === "active" || subscription.status === "trialing") &&
    !existing
  ) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (user) {
      try {
        await sendWelcomeToPremiumEmail(user.email, user.username || "there");
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
    }
  }
}

async function handleSubscriptionCanceled(subscription: any) {
  const userId = subscription.custom_data?.userId;
  const existingSub = await db.query.userSubscriptions.findFirst({
    where: userId
      ? eq(userSubscriptions.userId, userId)
      : eq(userSubscriptions.paddleSubscriptionId, subscription.id),
  });

  if (!existingSub) return;

  await db
    .update(userSubscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userSubscriptions.userId, existingSub.userId));

  // Downgrade to free plan
  const freePlan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.interval, "free"),
  });

  if (freePlan) {
    await db
      .update(userSubscriptions)
      .set({ planId: freePlan.id })
      .where(eq(userSubscriptions.userId, existingSub.userId));
  }

  // Send cancellation email
  const user = await db.query.users.findFirst({
    where: eq(users.id, existingSub.userId),
  });

  if (user && existingSub.currentPeriodEnd) {
    try {
      await sendSubscriptionCanceledEmail(
        user.email,
        user.username || "there",
        existingSub.currentPeriodEnd,
      );
    } catch (emailError) {
      console.error("Failed to send cancellation email:", emailError);
    }
  }
}

async function handleTransactionCompleted(transaction: any) {
  // Refresh subscription data after successful payment
  if (transaction.subscription_id) {
    const subscription = await paddle.subscriptions.get(
      transaction.subscription_id,
    );
    await handleSubscriptionUpdate(subscription);
  }
}

async function handlePaymentFailed(transaction: any) {
  const subscriptionId = transaction.subscription_id;
  if (!subscriptionId) return;

  const subscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.paddleSubscriptionId, subscriptionId),
  });

  if (!subscription) return;

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

  if (user) {
    try {
      await sendPaymentFailedEmail(user.email, user.username || "there");
    } catch (emailError) {
      console.error("Failed to send payment failed email:", emailError);
    }
  }
}
