import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const mocks = vi.hoisted(() => ({
  claimed: [] as { key: string }[],
  rows: [] as { token: string; userId: string }[],
  where: vi.fn(),
  deleteWhere: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({ returning: async () => mocks.claimed }),
      }),
    }),
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: async (condition: unknown) => {
            mocks.where(condition);
            return mocks.rows;
          },
        }),
      }),
    }),
    delete: () => ({ where: mocks.deleteWhere }),
  },
}));
vi.mock("@/lib/blocks", () => ({ getBlockedIds: async () => [] }));
vi.mock("expo-server-sdk", () => ({
  Expo: class {
    static isExpoPushToken(token: unknown) {
      return typeof token === "string" && token.startsWith("ExponentPushToken[");
    }
    chunkPushNotifications<T>(messages: T[]) {
      return [messages];
    }
    sendPushNotificationsAsync = mocks.send;
  },
}));

import { audienceRecipients, sendPush } from "./push";

const dialect = new PgDialect();
const token = (id: string) => `ExponentPushToken[${id}]`;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.claimed = [{ key: "k" }];
  mocks.rows = [];
});

describe("audienceRecipients", () => {
  const followers = ["a", "b", "c"];

  it("reaches every follower for public and followers", () => {
    expect(audienceRecipients("public", followers, [], [])).toEqual(followers);
    expect(audienceRecipients("followers", followers, [], [])).toEqual(followers);
  });

  it("reaches only mutual follows for friends", () => {
    expect(audienceRecipients("friends", followers, ["b", "z"], [])).toEqual(["b"]);
  });

  it("reaches nobody for private", () => {
    expect(audienceRecipients("private", followers, followers, [])).toEqual([]);
  });

  it("leaves out blocked users", () => {
    expect(audienceRecipients("followers", followers, [], ["a"])).toEqual(["b", "c"]);
  });
});

describe("sendPush", () => {
  const input = {
    userIds: ["u1", "u2"],
    category: "reviews" as const,
    title: "Ana",
    body: "Reviewed Dune",
    url: "/book/b1",
  };

  it("filters recipients by the category's toggle", async () => {
    await sendPush(input);
    const condition = mocks.where.mock.calls[0]?.[0] as SQL;
    expect(dialect.sqlToQuery(condition).sql).toContain('"notify_reviews"');
  });

  it("skips an event that was already notified", async () => {
    mocks.claimed = [];
    const result = await sendPush({ ...input, dedupeKey: "review:r1" });
    expect(result.sent).toBe(0);
    expect(mocks.where).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("sends to valid tokens with the url and channel", async () => {
    mocks.rows = [
      { token: token("1"), userId: "u1" },
      { token: "not-a-token", userId: "u2" },
    ];
    mocks.send.mockResolvedValue([{ status: "ok", id: "t1" }]);

    const result = await sendPush(input);

    expect(mocks.send).toHaveBeenCalledWith([
      expect.objectContaining({
        to: token("1"),
        data: { url: "/book/b1" },
        channelId: "reviews",
      }),
    ]);
    expect(result).toEqual({ recipients: 1, devices: 1, sent: 1, failed: 0 });
  });

  it("deletes tokens that are no longer registered", async () => {
    mocks.rows = [
      { token: token("1"), userId: "u1" },
      { token: token("2"), userId: "u2" },
    ];
    mocks.send.mockResolvedValue([
      { status: "ok", id: "t1" },
      { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } },
    ]);

    const result = await sendPush(input);

    expect(result).toEqual({ recipients: 2, devices: 2, sent: 1, failed: 1 });
    const condition = mocks.deleteWhere.mock.calls[0]?.[0] as SQL;
    expect(dialect.sqlToQuery(condition).params).toEqual([token("2")]);
  });

  it("does nothing without recipients", async () => {
    const result = await sendPush({ ...input, userIds: [] });
    expect(result.devices).toBe(0);
    expect(mocks.where).not.toHaveBeenCalled();
  });
});
