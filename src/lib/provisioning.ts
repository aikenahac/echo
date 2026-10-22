import "server-only";
import { db } from "@/db";
import { subscriptionPlans, userSubscriptions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Get the free plan (or create it if it doesn't exist).
 * Finds plans by interval type "free", not by price.
 */
export async function getOrCreateFreePlan() {
  const freePlan = await db.query.subscriptionPlans.findFirst({
    where: and(
      eq(subscriptionPlans.interval, "free"),
      eq(subscriptionPlans.isActive, true)
    ),
    orderBy: (plans, { asc }) => [asc(plans.sortOrder)],
  });

  if (freePlan) return freePlan;

  const [created] = await db
    .insert(subscriptionPlans)
    .values({
      name: "Free",
      price: 0,
      interval: "free",
      isActive: true,
      isInternal: false,
      sortOrder: 0,
    })
    .returning();

  return created;
}

/**
 * Assign the free plan to a user who has no subscription yet.
 * Safe to call concurrently: an existing subscription is never overwritten.
 */
export async function ensureFreePlan(userId: string) {
  try {
    const freePlan = await getOrCreateFreePlan();

    await db
      .insert(userSubscriptions)
      .values({
        userId,
        planId: freePlan.id,
        source: "manual",
        status: "active",
        currentPeriodStart: new Date(),
        // Far future for free plan
        currentPeriodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 100)),
        cancelAtPeriodEnd: false,
      })
      .onConflictDoNothing({ target: userSubscriptions.userId });

    return { success: true };
  } catch (error) {
    console.error("Error assigning free plan to user:", error);
    return { error: "Failed to assign free plan" };
  }
}
