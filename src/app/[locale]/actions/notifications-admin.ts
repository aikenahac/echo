"use server";

import { z } from "zod";
import { and, count, countDistinct, eq, inArray, isNotNull, or, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  pushTokens,
  subscriptionPlans,
  userSubscriptions,
  users,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { sendPush, type PushResult } from "@/lib/push";

const audienceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("self") }),
  z.object({ kind: z.literal("user"), identifier: z.string().trim().min(1).max(320) }),
  z.object({ kind: z.literal("all") }),
  z.object({ kind: z.literal("premium") }),
]);

export type NotificationAudience = z.infer<typeof audienceSchema>;

const sendSchema = z.object({
  audience: audienceSchema,
  title: z.string().trim().min(1, "Title is required").max(65),
  body: z.string().trim().min(1, "Message is required").max(180),
  // An app path opened on tap, e.g. "/friends" or "/book/<id>"
  url: z
    .string()
    .trim()
    .max(200)
    .regex(/^\/(?!\/)\S*$/, "Links are app paths starting with /")
    .optional(),
});

export type SendAdminNotificationInput = z.input<typeof sendSchema>;

// Users with an active Premium subscription; matches isPaidPlan in lib/plans
const premiumUserIds = db
  .select({ id: userSubscriptions.userId })
  .from(userSubscriptions)
  .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, userSubscriptions.planId))
  .where(
    and(
      inArray(userSubscriptions.status, ["active", "trialing"]),
      or(
        gt(subscriptionPlans.price, 0),
        isNotNull(subscriptionPlans.lemonSqueezyVariantId),
        eq(subscriptionPlans.interval, "lifetime"),
      ),
    ),
  );

/** The users condition for an audience; null when a single user isn't found */
async function audienceCondition(audience: NotificationAudience, selfId: string) {
  switch (audience.kind) {
    case "self":
      return eq(users.id, selfId);
    case "user": {
      const identifier = audience.identifier.replace(/^@/, "").toLowerCase();
      const user = await db.query.users.findFirst({
        where: or(
          sql`lower(${users.username}) = ${identifier}`,
          sql`lower(${users.email}) = ${identifier}`,
          eq(users.id, audience.identifier),
        ),
        columns: { id: true },
      });
      return user ? eq(users.id, user.id) : null;
    }
    case "all":
      return sql`true`;
    case "premium":
      return inArray(users.id, premiumUserIds);
  }
}

/**
 * How many users an audience reaches (admin only): everyone in it, and those
 * with announcements on and a registered device
 */
export async function countNotificationAudience(input: NotificationAudience) {
  const currentUser = await requireRole(["admin"]);

  const parsed = audienceSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid audience" };

  const condition = await audienceCondition(parsed.data, currentUser.id);
  if (!condition) return { error: "User not found" };

  const [[total], [reachable]] = await Promise.all([
    db.select({ value: count() }).from(users).where(condition),
    db
      .select({ value: countDistinct(pushTokens.userId) })
      .from(pushTokens)
      .innerJoin(users, eq(users.id, pushTokens.userId))
      .where(and(condition, eq(users.notifyAnnouncements, true))),
  ]);

  return { success: true, users: total?.value ?? 0, reachable: reachable?.value ?? 0 };
}

// Recipients per sendPush call; each call chunks its messages for Expo
const SEND_BATCH = 500;

/**
 * Send an announcement push notification (admin only). Respects each
 * recipient's announcements toggle.
 */
export async function sendAdminNotification(input: SendAdminNotificationInput) {
  const currentUser = await requireRole(["admin"]);

  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { audience, title, body, url } = parsed.data;

  const condition = await audienceCondition(audience, currentUser.id);
  if (!condition) return { error: "User not found" };

  try {
    // Only users with a device can receive anything
    const recipients = await db
      .selectDistinct({ id: pushTokens.userId })
      .from(pushTokens)
      .innerJoin(users, eq(users.id, pushTokens.userId))
      .where(condition);
    const userIds = recipients.map((r) => r.id);

    const result: PushResult = { recipients: 0, devices: 0, sent: 0, failed: 0 };
    for (let i = 0; i < userIds.length; i += SEND_BATCH) {
      const batch = await sendPush({
        userIds: userIds.slice(i, i + SEND_BATCH),
        category: "announcements",
        title,
        body,
        url,
      });
      result.recipients += batch.recipients;
      result.devices += batch.devices;
      result.sent += batch.sent;
      result.failed += batch.failed;
    }

    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "notification.send",
      targetType: "notification",
      metadata: JSON.stringify({ audience, title, body, url, ...result }),
    });

    return { success: true, ...result };
  } catch (error) {
    console.error("Error sending admin notification:", error);
    return { error: "Failed to send notification" };
  }
}
