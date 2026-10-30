import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {} }));

import {
  resolveStoreState,
  shouldWrite,
  type RcSubscriber,
  type StoreState,
} from "@/lib/revenuecat";

const now = new Date("2026-10-17T12:00:00Z");
const expired = "2026-10-16T12:00:00Z";
const future = "2026-11-17T12:00:00Z";

function subscriber({
  productId = "echo_premium_monthly",
  store = "app_store",
  expiresDate = future,
  graceDate = null,
  trial = false,
  unsubscribed = false,
}: {
  productId?: string;
  store?: string;
  expiresDate?: string | null;
  graceDate?: string | null;
  trial?: boolean;
  unsubscribed?: boolean;
} = {}): RcSubscriber {
  return {
    entitlements: {
      premium: {
        expires_date: expiresDate,
        grace_period_expires_date: graceDate,
        product_identifier: productId,
        purchase_date: "2026-10-01T12:00:00Z",
      },
    },
    subscriptions: {
      [productId]: {
        store,
        period_type: trial ? "trial" : "normal",
        unsubscribe_detected_at: unsubscribed ? expired : null,
      },
    },
    non_subscriptions: {},
  };
}

const monthly: StoreState = {
  active: true,
  source: "app_store",
  productId: "echo_premium_monthly",
  lifetime: false,
  trialing: false,
  periodStart: new Date("2026-10-01T12:00:00Z"),
  periodEnd: new Date(future),
  cancelAtPeriodEnd: false,
};

function existing(source: string, status = "active", interval = "month") {
  const price = interval === "free" ? 0 : 199;
  return { source, status, plan: { price, lemonSqueezyVariantId: null, interval } };
}

describe("resolveStoreState", () => {
  it("resolves an active monthly App Store subscription", () => {
    expect(resolveStoreState(subscriber(), now)).toEqual(monthly);
  });

  it("keeps the Play base plan in the product ID", () => {
    expect(resolveStoreState(subscriber({
      productId: "echo_premium:yearly", store: "play_store",
    }), now)).toMatchObject({
      active: true, source: "play_store", productId: "echo_premium:yearly",
    });
  });

  it("adds the Play base plan when RevenueCat reports it separately", () => {
    const yearly = subscriber({ productId: "echo_premium", store: "play_store" });
    yearly.subscriptions.echo_premium!.product_plan_identifier = "yearly";
    expect(resolveStoreState(yearly, now)).toMatchObject({ productId: "echo_premium:yearly" });
  });

  it("returns inactive for expired access", () => {
    expect(resolveStoreState(subscriber({ expiresDate: expired }), now)).toEqual({ active: false });
  });

  it("preserves access within the grace period", () => {
    expect(resolveStoreState(subscriber({ expiresDate: expired, graceDate: future }), now))
      .toMatchObject({ active: true });
  });

  it("resolves a lifetime Play purchase from non_subscriptions", () => {
    const lifetime = subscriber({ productId: "echo_premium_lifetime", expiresDate: null });
    lifetime.subscriptions = {};
    lifetime.non_subscriptions.echo_premium_lifetime = [{
      store: "play_store", purchase_date: "2026-10-01T12:00:00Z",
    }];
    expect(resolveStoreState(lifetime, now)).toMatchObject({
      active: true, source: "play_store", lifetime: true, periodEnd: null,
    });
  });

  it("marks a trial as trialing", () => {
    expect(resolveStoreState(subscriber({ trial: true }), now)).toMatchObject({ active: true, trialing: true });
  });

  it("marks detected unsubscribe as cancelAtPeriodEnd", () => {
    expect(resolveStoreState(subscriber({ unsubscribed: true }), now))
      .toMatchObject({ active: true, cancelAtPeriodEnd: true });
  });

  it("ignores promotional grants", () => {
    expect(resolveStoreState(subscriber({ store: "promotional" }), now)).toEqual({ active: false });
  });

  it("returns inactive without a Premium entitlement", () => {
    expect(resolveStoreState({ entitlements: {}, subscriptions: {}, non_subscriptions: {} }, now))
      .toEqual({ active: false });
  });
});

describe("shouldWrite", () => {
  it("creates a row for active store access", () => {
    expect(shouldWrite(undefined, monthly)).toBe(true);
  });
  it("does not create an inactive row", () => {
    expect(shouldWrite(undefined, { active: false })).toBe(false);
  });
  it("preserves active Lemon Squeezy access", () => {
    expect(shouldWrite(existing("lemonsqueezy"), monthly)).toBe(false);
  });
  it("preserves active manual access", () => {
    expect(shouldWrite(existing("manual"), monthly)).toBe(false);
  });
  it("replaces active promo access with active store access", () => {
    expect(shouldWrite(existing("promo"), monthly)).toBe(true);
  });
  it("does not deactivate promo access", () => {
    expect(shouldWrite(existing("promo"), { active: false })).toBe(false);
  });
  it("preserves store lifetime access over monthly access", () => {
    expect(shouldWrite(existing("play_store", "active", "lifetime"), monthly)).toBe(false);
  });
  it("deactivates active store monthly access", () => {
    expect(shouldWrite(existing("app_store"), { active: false })).toBe(true);
  });
  it("does not deactivate Lemon Squeezy access", () => {
    expect(shouldWrite(existing("lemonsqueezy"), { active: false })).toBe(false);
  });
  it("replaces canceled Lemon Squeezy access with active store access", () => {
    expect(shouldWrite(existing("lemonsqueezy", "canceled"), monthly)).toBe(true);
  });

  it("replaces the active free-plan row every user has", () => {
    expect(shouldWrite(existing("manual", "active", "free"), monthly)).toBe(true);
    expect(shouldWrite(existing("lemonsqueezy", "active", "free"), monthly)).toBe(true);
  });
});
