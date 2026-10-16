import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userId: "me" as string | null,
  role: "moderator" as string | null,
  targetUser: { id: "other" } as { id: string } | undefined,
  review: undefined as { userId: string; content: string } | undefined,
  reportReturning: vi.fn(),
  reportValues: vi.fn(),
  blockValues: vi.fn(),
  txDelete: vi.fn(),
  updateReturning: vi.fn(),
  auditInsert: vi.fn(),
  rateLimitOk: true,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: mocks.userId }),
}));
vi.mock("@/lib/auth", () => ({
  requireRole: async (roles: string[]) => {
    if (!mocks.role) throw new Error("Unauthorized");
    if (!roles.includes(mocks.role)) throw new Error("Forbidden");
    return { id: "mod", role: mocks.role };
  },
}));
vi.mock("@/lib/revalidate", () => ({ revalidateLocalized: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: () => mocks.rateLimitOk }));
vi.mock("@/db", () => {
  const insert = (table: { _?: { name?: string } } & Record<string, unknown>) => ({
    values: (v: unknown) => {
      // blocks has blockerId; reports has reporterId; audit logs the rest
      if ("blockerId" in table) mocks.blockValues(v);
      else if ("reporterId" in table) mocks.reportValues(v);
      else mocks.auditInsert(v);
      return {
        onConflictDoNothing: () => ({ returning: mocks.reportReturning }),
        then: (resolve: (v: unknown) => unknown) => resolve(undefined),
      };
    },
  });
  const tx = {
    insert,
    delete: () => ({ where: mocks.txDelete }),
  };
  return {
    db: {
      insert,
      transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx),
      update: () => ({
        set: () => ({ where: () => ({ returning: mocks.updateReturning }) }),
      }),
      query: {
        users: { findFirst: async () => mocks.targetUser },
        reviews: { findFirst: async () => mocks.review },
      },
    },
  };
});

import { blockUser } from "@/app/[locale]/actions/blocks";
import { reportReview, reportUser } from "@/app/[locale]/actions/reports";
import { resolveReport } from "@/app/[locale]/actions/reports-admin";

const ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userId = "me";
  mocks.role = "moderator";
  mocks.targetUser = { id: "other" };
  mocks.review = undefined;
  mocks.rateLimitOk = true;
  mocks.reportReturning.mockResolvedValue([{ id: ID }]);
  mocks.updateReturning.mockResolvedValue([{ id: ID }]);
});

describe("blockUser", () => {
  it("requires sign-in", async () => {
    mocks.userId = null;
    expect(await blockUser("other")).toEqual({ error: "Unauthorized" });
  });

  it("refuses to block yourself", async () => {
    expect(await blockUser("me")).toEqual({ error: "You cannot block yourself" });
    expect(mocks.blockValues).not.toHaveBeenCalled();
  });

  it("refuses unknown users", async () => {
    mocks.targetUser = undefined;
    expect(await blockUser("ghost")).toEqual({ error: "User not found" });
  });

  it("stores the block and removes follows in both directions", async () => {
    expect(await blockUser("other")).toEqual({ success: true });
    expect(mocks.blockValues).toHaveBeenCalledWith({ blockerId: "me", blockedId: "other" });
    expect(mocks.txDelete).toHaveBeenCalledTimes(1);
  });
});

describe("reports", () => {
  it("rejects an unknown reason", async () => {
    const result = await reportUser({ targetId: "other", reason: "boring" });
    expect(result).toEqual({ error: "Invalid report" });
    expect(mocks.reportValues).not.toHaveBeenCalled();
  });

  it("refuses self reports", async () => {
    expect(await reportUser({ targetId: "me", reason: "spam" })).toEqual({
      error: "You cannot report yourself",
    });
  });

  it("is rate limited", async () => {
    mocks.rateLimitOk = false;
    const result = await reportUser({ targetId: "other", reason: "spam" });
    expect(result.error).toMatch(/too many/i);
  });

  it("stores a user report", async () => {
    const result = await reportUser({ targetId: "other", reason: "harassment", details: " rude " });
    expect(result).toEqual({ success: true });
    expect(mocks.reportValues).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterId: "me",
        targetType: "user",
        targetId: "other",
        targetUserId: "other",
        reason: "harassment",
        details: "rude",
      }),
    );
  });

  it("does not error when reporting the same thing twice", async () => {
    mocks.reportReturning.mockResolvedValue([]);
    expect(await reportUser({ targetId: "other", reason: "spam" })).toEqual({ success: true });
  });

  it("reports a public review with a snapshot, but not your own", async () => {
    mocks.review = { userId: "other", content: "buy pills" };
    expect(await reportReview({ targetId: ID, reason: "spam" })).toEqual({ success: true });
    expect(mocks.reportValues).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: "review",
        targetUserId: "other",
        contentSnapshot: "buy pills",
      }),
    );

    mocks.review = { userId: "me", content: "mine" };
    expect(await reportReview({ targetId: ID, reason: "spam" })).toEqual({
      error: "You cannot report your own review",
    });
  });

  it("reports a missing or private review as not found", async () => {
    expect(await reportReview({ targetId: ID, reason: "spam" })).toEqual({ error: "Not found" });
  });
});

describe("resolveReport", () => {
  it("is moderator-only", async () => {
    mocks.role = "user";
    await expect(resolveReport(ID, "resolved")).rejects.toThrow(/forbidden/i);
  });

  it("rejects invalid input", async () => {
    expect(await resolveReport("nope", "resolved")).toEqual({ error: "Invalid input" });
    expect(await resolveReport(ID, "open")).toEqual({ error: "Invalid input" });
  });

  it("closes the report and writes an audit log without the note", async () => {
    expect(await resolveReport(ID, "dismissed", "not abusive")).toEqual({ success: true });
    expect(mocks.auditInsert).toHaveBeenCalledWith({
      userId: "mod",
      action: "report.resolve",
      targetId: ID,
      targetType: "report",
      metadata: JSON.stringify({ status: "dismissed" }),
    });
  });

  it("reports a missing report", async () => {
    mocks.updateReturning.mockResolvedValue([]);
    expect(await resolveReport(ID, "resolved")).toEqual({ error: "Report not found" });
  });
});
