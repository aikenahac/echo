import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPlans, userSubscriptions } from "@/db/schema";
import { isPaidPlan } from "@/lib/plans";

/**
 * In-app purchases (App Store, Google Play) go through RevenueCat. The app's
 * RevenueCat app_user_id is the Clerk user ID, so a subscriber maps straight to
 * users.id. We never trust a webhook payload: every event re-reads the
 * subscriber and syncs the user's row, which makes events order- and retry-safe.
 */

export const PREMIUM_ENTITLEMENT = "premium";

type StoreSource = "app_store" | "play_store";

// RevenueCat REST v1 subscriber (only the fields we read)
type RcEntitlement = {
  expires_date: string | null;
  grace_period_expires_date: string | null;
  product_identifier: string;
  purchase_date: string;
};

type RcSubscription = {
  store: string;
  period_type: "normal" | "trial" | "intro" | "prepaid";
  unsubscribe_detected_at: string | null;
  /** Google Play base plan, when product_identifier doesn't carry it */
  product_plan_identifier?: string | null;
};

type RcNonSubscription = { store: string; purchase_date: string };

export type RcSubscriber = {
  entitlements: Record<string, RcEntitlement | undefined>;
  subscriptions: Record<string, RcSubscription | undefined>;
  non_subscriptions: Record<string, RcNonSubscription[] | undefined>;
};

export async function fetchSubscriber(appUserId: string): Promise<RcSubscriber> {
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: { Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}` },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`RevenueCat subscriber fetch failed: ${res.status}`);
  }
  const body = (await res.json()) as { subscriber: RcSubscriber };
  return body.subscriber;
}

/** The store's view of the user's Premium, flattened */
export type StoreState =
  | {
      active: true;
      source: StoreSource;
      /** Store product id; Play subscriptions are "subscription:basePlan" (monthly and yearly share a subscription) */
      productId: string;
      lifetime: boolean;
      trialing: boolean;
      periodStart: Date;
      periodEnd: Date | null;
      cancelAtPeriodEnd: boolean;
    }
  | { active: false };

const toSource = (store: string | undefined): StoreSource | null =>
  store === "app_store" || store === "play_store" ? store : null;

export function resolveStoreState(subscriber: RcSubscriber, now = new Date()): StoreState {
  const entitlement = subscriber.entitlements[PREMIUM_ENTITLEMENT];
  if (!entitlement) return { active: false };

  const ends = [entitlement.expires_date, entitlement.grace_period_expires_date]
    .filter((d): d is string => !!d)
    .map((d) => new Date(d).getTime());
  const lifetime = entitlement.expires_date === null;
  if (!lifetime && Math.max(...ends) <= now.getTime()) return { active: false };

  const [baseId, basePlan] = entitlement.product_identifier.split(":");
  const subscription = subscriber.subscriptions[entitlement.product_identifier]
    ?? subscriber.subscriptions[baseId];
  const purchase = subscriber.non_subscriptions[baseId]?.at(-1);
  const source = toSource(lifetime ? purchase?.store : subscription?.store);
  // Promotional or web (Stripe) grants in RevenueCat aren't ours to mirror
  if (!source) return { active: false };

  const plan = basePlan ?? subscription?.product_plan_identifier;
  const productId = source === "play_store" && !lifetime && plan ? `${baseId}:${plan}` : baseId;

  return {
    active: true,
    source,
    productId,
    lifetime,
    trialing: subscription?.period_type === "trial",
    periodStart: new Date(entitlement.purchase_date),
    periodEnd: entitlement.expires_date ? new Date(entitlement.expires_date) : null,
    cancelAtPeriodEnd: !lifetime && !!subscription?.unsubscribe_detected_at,
  };
}

type ExistingRow = {
  source: string;
  status: string;
  plan: { price: number; lemonSqueezyVariantId: string | null; interval: string };
};

const isActiveStatus = (status: string) => status === "active" || status === "trialing";
/** Every user has an active free-plan row; only an active paid row is Premium */
const holdsPremium = (row: ExistingRow) => isActiveStatus(row.status) && isPaidPlan(row.plan);
const isStoreSource = (source: string) => source === "app_store" || source === "play_store";

/**
 * Whether the store state may replace the user's row. One row per user, so:
 * an active web (Lemon Squeezy) or admin-granted row is never touched; a store
 * subscription never replaces an active store lifetime; anything inactive can be
 * replaced. A lapsed store state only ever cancels a store row.
 */
export function shouldWrite(existing: ExistingRow | undefined, state: StoreState): boolean {
  if (!state.active) {
    return !!existing && isStoreSource(existing.source) && holdsPremium(existing);
  }
  if (!existing || !holdsPremium(existing)) return true;
  // A promo grant gives way to a real purchase
  if (existing.source === "promo") return true;
  if (!isStoreSource(existing.source)) return false;
  return state.lifetime || existing.plan.interval !== "lifetime";
}

export type SyncResult = "activated" | "updated" | "deactivated" | "unchanged";

/** Re-read the user's RevenueCat subscriber and mirror it onto user_subscriptions */
export async function syncStoreSubscription(userId: string): Promise<SyncResult> {
  const subscriber = await fetchSubscriber(userId);
  const state = resolveStoreState(subscriber);
  const existing = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId),
    with: { plan: true },
  });

  if (!shouldWrite(existing, state)) return "unchanged";

  if (!state.active) {
    await db
      .update(userSubscriptions)
      .set({
        status: "canceled",
        cancelAtPeriodEnd: false,
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.userId, userId));
    return "deactivated";
  }

  const productColumn =
    state.source === "app_store"
      ? subscriptionPlans.appStoreProductId
      : subscriptionPlans.playStoreProductId;
  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(productColumn, state.productId),
  });
  if (!plan) {
    throw new Error(`No plan for ${state.source} product ${state.productId}`);
  }

  const values = {
    planId: plan.id,
    source: state.source,
    storeProductId: state.productId,
    lemonSqueezySubscriptionId: null,
    lemonSqueezyCustomerId: null,
    status: state.trialing ? ("trialing" as const) : ("active" as const),
    currentPeriodStart: state.periodStart,
    currentPeriodEnd: state.periodEnd,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    canceledAt: null,
  };

  await db
    .insert(userSubscriptions)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: userSubscriptions.userId,
      set: { ...values, updatedAt: new Date() },
    });

  return existing && holdsPremium(existing) ? "updated" : "activated";
}
