import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, userSubscriptions } from "@/db/schema";
import { getStripe } from "@/lib/stripe";

export class AccountDeletionError extends Error {}

/**
 * Permanently delete an account: cancels any running Stripe subscription,
 * deletes the user row (cascades to library, reviews, follows, collections
 * and subscription), then deletes the Clerk user. Shared by DELETE
 * /api/v1/profile and the web Settings page.
 */
export async function deleteUserAccount(userId: string) {
  const subscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId),
  });

  if (
    subscription?.stripeSubscriptionId &&
    ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(
      subscription.status,
    )
  ) {
    try {
      await getStripe().subscriptions.cancel(subscription.stripeSubscriptionId);
    } catch (error) {
      console.error("Error cancelling subscription on account deletion:", error);
      throw new AccountDeletionError(
        "Could not cancel your subscription. Try again.",
      );
    }
  }

  // Delete the data first: if the Clerk call then fails, the client is still
  // signed in and can retry (the next request re-provisions an empty row).
  await db.delete(users).where(eq(users.id, userId));

  const client = await clerkClient();
  await client.users.deleteUser(userId);
}
