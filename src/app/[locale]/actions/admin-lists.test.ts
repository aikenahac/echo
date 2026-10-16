import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const mocks = vi.hoisted(() => ({
  role: "admin" as string | null,
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  offset: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireRole: async (roles: string[]) => {
    if (!mocks.role) throw new Error("Unauthorized");
    if (!roles.includes(mocks.role)) throw new Error("Forbidden: Insufficient permissions");
    return { id: "u1", role: mocks.role };
  },
}));
vi.mock("@/lib/revalidate", () => ({ revalidateLocalized: vi.fn() }));
vi.mock("@/lib/lemonsqueezy", () => ({ getLemonSqueezy: vi.fn() }));
vi.mock("@/db", () => {
  const chain = {
    from: () => chain,
    leftJoin: () => chain,
    innerJoin: () => chain,
    groupBy: () => chain,
    where: (condition: unknown) => {
      mocks.where(condition);
      return chain;
    },
    orderBy: (...order: unknown[]) => {
      mocks.orderBy(...order);
      return chain;
    },
    limit: (n: number) => {
      mocks.limit(n);
      return chain;
    },
    offset: (n: number) => {
      mocks.offset(n);
      return Promise.resolve([]);
    },
    then: (resolve: (v: unknown) => unknown) => resolve([{ total: 42 }]),
  };
  return {
    db: {
      select: () => chain,
      query: { users: { findMany: async (args: unknown) => (mocks.findMany(args), []) } },
    },
  };
});

import {
  listBooksAdmin,
  listReviewsAdmin,
  listUsersAdmin,
} from "@/app/[locale]/actions/admin";

const render = (condition: unknown) => new PgDialect().sqlToQuery(condition as SQL);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = "admin";
});

describe("list access", () => {
  const calls: [string, () => Promise<unknown>][] = [
    ["listUsersAdmin", () => listUsersAdmin({})],
    ["listBooksAdmin", () => listBooksAdmin({})],
    ["listReviewsAdmin", () => listReviewsAdmin({})],
  ];

  for (const role of ["user", null]) {
    it.each(calls)(`${"%s"} rejects role ${role}`, async (_name, call) => {
      mocks.role = role;
      await expect(call()).rejects.toThrow();
      expect(mocks.where).not.toHaveBeenCalled();
      expect(mocks.findMany).not.toHaveBeenCalled();
    });
  }

  it.each(calls)("%s allows moderators", async (_name, call) => {
    mocks.role = "moderator";
    await expect(call()).resolves.toMatchObject({ total: 42 });
  });
});

describe("listUsersAdmin", () => {
  it("searches email and username with escaped wildcards and filters by role", async () => {
    await listUsersAdmin({ search: "a_b%", role: "moderator" });
    const { where } = mocks.findMany.mock.calls[0][0];
    const { sql, params } = render(where);
    expect(sql).toMatch(/"email" ilike/);
    expect(sql).toMatch(/"username" ilike/);
    expect(params).toContain("%a\\_b\\%%");
    expect(params).toContain("moderator");
  });

  it("pages and sorts from the params, falling back for unknown values", async () => {
    await listUsersAdmin({ page: "2", pageSize: "50", sort: "password", role: "root" });
    const args = mocks.findMany.mock.calls[0][0];
    expect(args).toMatchObject({ limit: 50, offset: 50 });
    expect(args.where).toBeUndefined();
    expect(render(args.orderBy[0]).sql).toBe('"users"."created_at" desc');
  });

  it("returns the page count from the total", async () => {
    expect(await listUsersAdmin({ pageSize: "10" })).toMatchObject({
      total: 42,
      pageCount: 5,
    });
  });
});

describe("listBooksAdmin", () => {
  it("defaults to the most-shelved books first", async () => {
    await listBooksAdmin({});
    expect(render(mocks.orderBy.mock.calls[0][0]).sql).toBe('count("user_books"."id") desc');
  });

  it("searches title, author and isbn", async () => {
    await listBooksAdmin({ search: "dune", sort: "title", dir: "asc" });
    const { sql } = render(mocks.where.mock.calls[0][0]);
    expect(sql).toMatch(/"title" ilike/);
    expect(sql).toMatch(/"author" ilike/);
    expect(sql).toMatch(/"isbn" ilike/);
    expect(render(mocks.orderBy.mock.calls[0][0]).sql).toBe('"books"."title" asc');
  });
});

describe("listReviewsAdmin", () => {
  it("filters by visibility", async () => {
    await listReviewsAdmin({ visibility: "private" });
    expect(render(mocks.where.mock.calls[0][0]).params).toContain(true);
  });

  it("offsets by page and page size", async () => {
    await listReviewsAdmin({ page: "4", pageSize: "10" });
    expect(mocks.limit).toHaveBeenCalledWith(10);
    expect(mocks.offset).toHaveBeenCalledWith(30);
  });
});
