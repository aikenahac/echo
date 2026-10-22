import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users, userSubscriptions, webhookEvents } from "@/db/schema";
import { syncStoreSubscription } from "@/lib/revenuecat";
import {
  sendWelcomeToPremiumEmail,
  sendSubscriptionCanceledEmail,
  sendPaymentFailedEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const webhookSchema = z.object({
  api_version: z.string(),
  event: z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    app_user_id: z.string().optional(),
    original_app_user_id: z.string().optional(),
    transferred_from: z.array(z.string()).optional(),
    transferred_to: z.array(z.string()).optional(),
    environment: z.string(),
  }).refine((event) => event.type === "TEST" || event.type === "TRANSFER" || !!event.app_user_id),
});

export async function POST(req: NextRequest) {
  const secret = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!secret) {
    console.error("REVENUECAT_WEBHOOK_AUTH is not configured");
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 500 });
  }

  const supplied = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(secret);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
  const parsed = webhookSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
  const { event } = parsed.data;
  if (event.type === "TEST") return NextResponse.json({ received: true });

  const eventId = `rc:${event.id}`;
  const [newEvent] = await db.insert(webhookEvents)
    .values({ id: eventId, type: `rc:${event.type}` })
    .onConflictDoNothing()
    .returning();
  if (!newEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const ids = event.type === "TRANSFER"
      ? [...(event.transferred_from ?? []), ...(event.transferred_to ?? [])]
      : event.app_user_id ? [event.app_user_id] : [];

    for (const id of new Set(ids)) {
      if (id.startsWith("$RCAnonymousID:")) {
        console.log("Skipping anonymous RevenueCat user:", id);
        continue;
      }
      const user = await db.query.users.findFirst({ where: eq(users.id, id) });
      if (!user) {
        console.log("Skipping unknown RevenueCat user:", id);
        continue;
      }

      const result = await syncStoreSubscription(id);
      if (!user.email) continue;
      const name = user.username || "there";
      if (result === "activated") {
        try {
          await sendWelcomeToPremiumEmail(user.email, name);
        } catch (error) {
          console.error("Failed to send welcome email:", error);
        }
      }
      if (result === "deactivated") {
        try {
          const subscription = await db.query.userSubscriptions.findFirst({
            where: eq(userSubscriptions.userId, id),
          });
          await sendSubscriptionCanceledEmail(
            user.email, name, subscription?.currentPeriodEnd ?? new Date(),
          );
        } catch (error) {
          console.error("Failed to send cancellation email:", error);
        }
      }
      if (event.type === "BILLING_ISSUE") {
        try {
          await sendPaymentFailedEmail(user.email, name);
        } catch (error) {
          console.error("Failed to send payment failed email:", error);
        }
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing RevenueCat webhook:", error);
    await db.delete(webhookEvents).where(eq(webhookEvents.id, eventId));
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
