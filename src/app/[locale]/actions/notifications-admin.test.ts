import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "admin" as string | null,
  findUser: vi.fn(),
  recipients: [] as { id: string }[],
  auditInsert: vi.fn(),
  sendPush: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireRole: async (roles: string[]) => {
    if (!mocks.role) throw new Error("Unauthorized");
    if (!roles.includes(mocks.role)) throw new Error("Forbidden: Insufficient permissions");
    return { id: "admin1", role: mocks.role };
  },
}));
vi.mock("@/lib/push", () => ({ sendPush: mocks.sendPush }));
vi.mock("@/db", () => {
  const subquery = {
    from: () => subquery,
    innerJoin: () => subquery,
    where: () => subquery,
  };
  return {
    db: {
      // The premium subquery is built when the module loads
      select: () => subquery,
      selectDistinct: () => ({
        from: () => ({
          innerJoin: () => ({ where: async () => mocks.recipients }),
        }),
      }),
      insert: () => ({ values: mocks.auditInsert }),
      query: { users: { findFirst: mocks.findUser } },
    },
  };
});

import { sendAdminNotification } from "./notifications-admin";

const valid = {
  audience: { kind: "self" as const },
  title: "Hello",
  body: "A new feature is here",
  url: "/friends",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = "admin";
  mocks.recipients = [{ id: "admin1" }];
  mocks.sendPush.mockResolvedValue({ recipients: 1, devices: 2, sent: 2, failed: 0 });
});

describe("sendAdminNotification", () => {
  it("is admin only", async () => {
    mocks.role = "moderator";
    await expect(sendAdminNotification(valid)).rejects.toThrow(/Forbidden/);
    expect(mocks.sendPush).not.toHaveBeenCalled();
  });

  it("rejects links that aren't app paths", async () => {
    for (const url of ["https://evil.example", "//evil.example", "friends"]) {
      const result = await sendAdminNotification({ ...valid, url });
      expect(result).toEqual({ error: "Links are app paths starting with /" });
    }
    expect(mocks.sendPush).not.toHaveBeenCalled();
  });

  it("requires a title and message", async () => {
    expect(await sendAdminNotification({ ...valid, title: "  " })).toEqual({
      error: "Title is required",
    });
  });

  it("reports a missing user", async () => {
    mocks.findUser.mockResolvedValue(undefined);
    const result = await sendAdminNotification({
      ...valid,
      audience: { kind: "user", identifier: "@nobody" },
    });
    expect(result).toEqual({ error: "User not found" });
  });

  it("sends as an announcement and writes an audit log", async () => {
    const result = await sendAdminNotification(valid);

    expect(mocks.sendPush).toHaveBeenCalledWith({
      userIds: ["admin1"],
      category: "announcements",
      title: "Hello",
      body: "A new feature is here",
      url: "/friends",
    });
    expect(result).toEqual({ success: true, recipients: 1, devices: 2, sent: 2, failed: 0 });
    expect(mocks.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "admin1", action: "notification.send" }),
    );
  });

  it("sends in batches", async () => {
    mocks.recipients = Array.from({ length: 1200 }, (_, i) => ({ id: `u${i}` }));
    const result = await sendAdminNotification({ ...valid, audience: { kind: "all" } });

    expect(mocks.sendPush).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ sent: 6 });
  });
});
