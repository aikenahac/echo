import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  values: vi.fn(),
  onConflictDoNothing: vi.fn(),
  returning: vi.fn<() => Promise<{ id: string }[]>>(),
  delete: vi.fn(),
  where: vi.fn(),
  user: vi.fn<() => Promise<{ id: string; email: string; username: string } | undefined>>(),
  subscription: vi.fn(),
  sync: vi.fn<(id: string) => Promise<"activated" | "updated" | "deactivated" | "unchanged">>(),
  welcome: vi.fn(),
  canceled: vi.fn(),
  paymentFailed: vi.fn(),
}));

vi.mock("@/db", () => ({ db: {
  insert: mocks.insert,
  delete: mocks.delete,
  query: { users: { findFirst: mocks.user }, userSubscriptions: { findFirst: mocks.subscription } },
} }));
vi.mock("@/lib/revenuecat", () => ({ syncStoreSubscription: mocks.sync }));
vi.mock("@/lib/email", () => ({
  sendWelcomeToPremiumEmail: mocks.welcome,
  sendSubscriptionCanceledEmail: mocks.canceled,
  sendPaymentFailedEmail: mocks.paymentFailed,
}));

import { POST } from "./route";

function request(event: Record<string, unknown> = {}, authorization = "test-secret") {
  return new NextRequest("https://echo.test/api/webhooks/revenuecat", {
    method: "POST",
    headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify({ api_version: "1.0", event: {
      id: "event-1", type: "INITIAL_PURCHASE", app_user_id: "user-1",
      original_app_user_id: "user-1", environment: "SANDBOX", ...event,
    } }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("REVENUECAT_WEBHOOK_AUTH", "test-secret");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.values.mockReturnValue({ onConflictDoNothing: mocks.onConflictDoNothing });
  mocks.onConflictDoNothing.mockReturnValue({ returning: mocks.returning });
  mocks.returning.mockResolvedValue([{ id: "rc:event-1" }]);
  mocks.delete.mockReturnValue({ where: mocks.where });
  mocks.user.mockResolvedValue({ id: "user-1", email: "ada@example.com", username: "ada" });
  mocks.sync.mockResolvedValue("unchanged");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("RevenueCat webhook", () => {
  it("requires a configured secret", async () => {
    vi.stubEnv("REVENUECAT_WEBHOOK_AUTH", "");
    expect((await POST(request())).status).toBe(500);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it.each(["", "short", "wrong-value"])("rejects invalid authorization %j", async (authorization) => {
    expect((await POST(request({}, authorization))).status).toBe(401);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("acknowledges TEST without syncing", async () => {
    expect((await POST(request({ type: "TEST" }))).status).toBe(200);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it("rejects malformed events before recording them", async () => {
    expect((await POST(request({ id: "" }))).status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("namespaces events and acknowledges duplicates without syncing", async () => {
    mocks.returning.mockResolvedValue([]);
    const response = await POST(request());
    expect(await response.json()).toEqual({ received: true, duplicate: true });
    expect(mocks.values).toHaveBeenCalledWith({ id: "rc:event-1", type: "rc:INITIAL_PURCHASE" });
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it("syncs app_user_id rather than original_app_user_id", async () => {
    await POST(request({ original_app_user_id: "old-user" }));
    expect(mocks.sync).toHaveBeenCalledExactlyOnceWith("user-1");
  });

  it("syncs both sides of transfers, deduplicating and skipping unknown or anonymous users", async () => {
    mocks.user.mockResolvedValueOnce({ id: "from", email: "from@example.com", username: "from" })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: "to", email: "to@example.com", username: "to" });
    const response = await POST(request({
      type: "TRANSFER", app_user_id: undefined,
      transferred_from: ["from", "$RCAnonymousID:123", "unknown"],
      transferred_to: ["to", "from"],
    }));
    expect(response.status).toBe(200);
    expect(mocks.sync.mock.calls).toEqual([["from"], ["to"]]);
    expect(mocks.user).toHaveBeenCalledTimes(3);
  });

  it("forgets a failed event so it can be retried", async () => {
    mocks.sync.mockRejectedValue(new Error("RevenueCat unavailable"));
    expect((await POST(request())).status).toBe(500);
    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.where).toHaveBeenCalledOnce();
  });

  it("sends a welcome email on activation", async () => {
    mocks.sync.mockResolvedValue("activated");
    expect((await POST(request())).status).toBe(200);
    expect(mocks.welcome).toHaveBeenCalledWith("ada@example.com", "ada");
  });

  it("sends a cancellation email on deactivation", async () => {
    const end = new Date("2026-10-17T00:00:00Z");
    mocks.sync.mockResolvedValue("deactivated");
    mocks.subscription.mockResolvedValue({ currentPeriodEnd: end });
    expect((await POST(request())).status).toBe(200);
    expect(mocks.canceled).toHaveBeenCalledWith("ada@example.com", "ada", end);
  });

  it("sends payment failure mail for BILLING_ISSUE", async () => {
    expect((await POST(request({ type: "BILLING_ISSUE" }))).status).toBe(200);
    expect(mocks.paymentFailed).toHaveBeenCalledWith("ada@example.com", "ada");
  });

  it("keeps successful processing recorded when email delivery fails", async () => {
    mocks.sync.mockResolvedValue("activated");
    mocks.welcome.mockRejectedValue(new Error("Mail unavailable"));
    expect((await POST(request())).status).toBe(200);
    expect(mocks.delete).not.toHaveBeenCalled();
  });
});
