import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {} }));

import { holdsPremium, signState, verifyState } from "./discord";

const SECRET = "test-secret";
const NOW = 1_800_000_000_000;

describe("Discord OAuth state", () => {
  it("round-trips the user and return target", () => {
    const state = signState("user_1", "app", SECRET, NOW);
    expect(verifyState(state, SECRET, NOW + 1000)).toEqual({ userId: "user_1", returnTo: "app" });
  });

  it("rejects a tampered body", () => {
    const [, sig] = signState("user_1", "web", SECRET, NOW).split(".");
    const forged = Buffer.from(JSON.stringify({ u: "user_2", r: "web", e: NOW + 60_000 })).toString("base64url");
    expect(verifyState(`${forged}.${sig}`, SECRET, NOW)).toBeNull();
  });

  it("rejects another secret, expiry and garbage", () => {
    const state = signState("user_1", "web", SECRET, NOW);
    expect(verifyState(state, "other", NOW)).toBeNull();
    expect(verifyState(state, SECRET, NOW + 11 * 60 * 1000)).toBeNull();
    expect(verifyState(state, "", NOW)).toBeNull();
    expect(verifyState("nope", SECRET, NOW)).toBeNull();
  });
});

describe("holdsPremium", () => {
  const paid = { price: 499, lemonSqueezyVariantId: null, interval: "month" };
  const free = { price: 0, lemonSqueezyVariantId: null, interval: "free" };

  it("needs an active or trialing paid plan", () => {
    expect(holdsPremium({ status: "active", plan: paid })).toBe(true);
    expect(holdsPremium({ status: "trialing", plan: paid })).toBe(true);
    expect(holdsPremium({ status: "expired", plan: paid })).toBe(false);
    expect(holdsPremium({ status: "active", plan: free })).toBe(false);
    expect(holdsPremium(null)).toBe(false);
  });
});
