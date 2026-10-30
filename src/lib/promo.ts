import "server-only";
import { addMonths, addYears } from "date-fns";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { promoCodes, promoRedemptions, subscriptionPlans, userSubscriptions } from "@/db/schema";
import { isPaidPlan } from "@/lib/plans";
import { getOrCreateFreePlan } from "@/lib/provisioning";

export type PromoDurationUnit = (typeof promoCodes.$inferSelect)["durationUnit"];

export type RedeemError =
  | "invalid"
  | "inactive"
  | "usedUp"
  | "alreadyRedeemed"
  | "alreadyPremium"
  | "rateLimited";

export type RedeemResult =
  | { ok: true; planName: string; endsAt: Date | null }
  | { ok: false; error: RedeemError };

const CODE_PATTERN = /^[A-Z0-9]{4,32}$/;

/** Uppercase, without spaces or dashes; null when it can't be a code */
export function normalizeCode(raw: string): string | null {
  const code = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  return CODE_PATTERN.test(code) ? code : null;
}

/** Unambiguous alphabet: no 0/O, 1/I/L */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCode(length = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** When a grant starting at `start` ends; null for lifetime */
export function promoEnd(start: Date, unit: PromoDurationUnit, count: number | null) {
  if (unit === "lifetime") return null;
  const n = count ?? 1;
  return unit === "month" ? addMonths(start, n) : addYears(start, n);
}

const farFuture = () => new Date(new Date().setFullYear(new Date().getFullYear() + 100));

/**
 * Move the user back to the free plan once a time-limited promo grant has
 * ended. Lazy: called wherever the viewer is loaded, so every Premium check
 * sees the downgrade without a scheduled job.
 */
export async function expirePromoGrant(userId: string) {
  const expired = await db.query.userSubscriptions.findFirst({
    columns: { id: true },
    where: and(
      eq(userSubscriptions.userId, userId),
      eq(userSubscriptions.source, "promo"),
      lt(userSubscriptions.currentPeriodEnd, new Date()),
    ),
  });
  if (!expired) return;

  const freePlan = await getOrCreateFreePlan();
  await db
    .update(userSubscriptions)
    .set({
      planId: freePlan.id,
      source: "manual",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: farFuture(),
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userSubscriptions.id, expired.id),
        eq(userSubscriptions.source, "promo"),
        lt(userSubscriptions.currentPeriodEnd, new Date()),
      ),
    );
}

class RedeemAbort extends Error {
  constructor(readonly reason: RedeemError) {
    super(reason);
  }
}

/** Redeem a promo code for the user: one use per user per code */
export async function redeemPromo(userId: string, rawCode: string): Promise<RedeemResult> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "invalid" };

  // An expired grant must not count as current access (or be extended)
  await expirePromoGrant(userId);

  try {
    return await db.transaction(async (tx) => {
      const promo = await tx.query.promoCodes.findFirst({
        where: eq(promoCodes.code, code),
        with: { plan: true },
      });
      if (!promo) throw new RedeemAbort("invalid");
      if (!promo.isActive || !promo.plan.isActive) throw new RedeemAbort("inactive");

      // Lock the user's row so two codes redeemed at once can't both stack from the same end
      const [current] = await tx
        .select({
          source: userSubscriptions.source,
          status: userSubscriptions.status,
          currentPeriodEnd: userSubscriptions.currentPeriodEnd,
          plan: {
            price: subscriptionPlans.price,
            lemonSqueezyVariantId: subscriptionPlans.lemonSqueezyVariantId,
            interval: subscriptionPlans.interval,
          },
        })
        .from(userSubscriptions)
        .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(eq(userSubscriptions.userId, userId))
        .for("update", { of: userSubscriptions });

      const hasPremium =
        !!current &&
        (current.status === "active" || current.status === "trialing") &&
        isPaidPlan(current.plan);
      const activePromo = hasPremium && current.source === "promo";
      // Never replace paid or admin-granted access, nor a lifetime promo
      if (hasPremium && (!activePromo || current.currentPeriodEnd === null)) {
        throw new RedeemAbort("alreadyPremium");
      }

      const [redemption] = await tx
        .insert(promoRedemptions)
        .values({ codeId: promo.id, userId })
        .onConflictDoNothing()
        .returning({ id: promoRedemptions.id });
      if (!redemption) throw new RedeemAbort("alreadyRedeemed");

      const [counted] = await tx
        .update(promoCodes)
        .set({ redeemedCount: sql`${promoCodes.redeemedCount} + 1` })
        .where(
          and(
            eq(promoCodes.id, promo.id),
            eq(promoCodes.isActive, true),
            or(isNull(promoCodes.maxUses), lt(promoCodes.redeemedCount, promoCodes.maxUses)),
          ),
        )
        .returning({ id: promoCodes.id });
      if (!counted) throw new RedeemAbort("usedUp");

      const now = new Date();
      // A second time-limited promo extends the current one
      const from =
        activePromo && current.currentPeriodEnd && current.currentPeriodEnd > now
          ? current.currentPeriodEnd
          : now;
      const endsAt = promoEnd(from, promo.durationUnit, promo.durationCount);

      const values = {
        planId: promo.planId,
        source: "promo" as const,
        status: "active" as const,
        storeProductId: null,
        lemonSqueezySubscriptionId: null,
        lemonSqueezyCustomerId: null,
        currentPeriodStart: activePromo ? undefined : now,
        currentPeriodEnd: endsAt,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      };
      await tx
        .insert(userSubscriptions)
        .values({ userId, ...values, currentPeriodStart: values.currentPeriodStart ?? now })
        .onConflictDoUpdate({
          target: userSubscriptions.userId,
          set: { ...values, updatedAt: now },
        });

      return { ok: true as const, planName: promo.plan.name, endsAt };
    });
  } catch (error) {
    if (error instanceof RedeemAbort) return { ok: false, error: error.reason };
    throw error;
  }
}
