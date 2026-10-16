import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const mocks = vi.hoisted(() => ({
  role: "admin" as string | null,
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  offset: vi.fn(),
  set: vi.fn(),
  updateReturning: vi.fn(),
  auditInsert: vi.fn(),
  rows: [] as unknown[],
}));

vi.mock("@/lib/auth", () => {
  const user = () => (mocks.role ? { id: "u1", role: mocks.role } : null);
  return {
    getCurrentUser: async () => user(),
    requireRole: async (roles: string[]) => {
      const current = user();
      if (!current) throw new Error("Unauthorized");
      if (!roles.includes(current.role)) throw new Error("Forbidden: Insufficient permissions");
      return current;
    },
  };
});
vi.mock("@/lib/revalidate", () => ({ revalidateLocalized: vi.fn() }));
vi.mock("@/db", () => {
  const selectChain = {
    from: () => selectChain,
    where: (condition: unknown) => {
      mocks.where(condition);
      return selectChain;
    },
    orderBy: (...order: unknown[]) => {
      mocks.orderBy(...order);
      return selectChain;
    },
    limit: (n: number) => {
      mocks.limit(n);
      return selectChain;
    },
    offset: (n: number) => {
      mocks.offset(n);
      return Promise.resolve(mocks.rows);
    },
    then: (resolve: (v: unknown) => unknown) => resolve([{ total: mocks.rows.length }]),
  };
  return {
    db: {
      select: () => selectChain,
      update: () => ({
        set: (v: unknown) => {
          mocks.set(v);
          return {
            where: () => ({ returning: mocks.updateReturning }),
          };
        },
      }),
      insert: () => ({ values: mocks.auditInsert }),
      query: { supportTickets: { findFirst: async () => null } },
    },
  };
});

import {
  countOpenSupportTickets,
  deleteSupportTicket,
  getSupportTicket,
  listSupportTickets,
  updateSupportTicketNote,
  updateSupportTicketStatus,
} from "@/app/[locale]/actions/support-admin";

const ID = "11111111-1111-4111-8111-111111111111";
const render = (condition: unknown) => new PgDialect().sqlToQuery(condition as SQL);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = "admin";
  mocks.rows = [];
  mocks.updateReturning.mockResolvedValue([{ id: ID }]);
  mocks.auditInsert.mockResolvedValue(undefined);
});

describe("admin-only access", () => {
  const calls: [string, () => Promise<unknown>][] = [
    ["listSupportTickets", () => listSupportTickets({})],
    ["getSupportTicket", () => getSupportTicket(ID)],
    ["updateSupportTicketStatus", () => updateSupportTicketStatus(ID, "resolved")],
    ["updateSupportTicketNote", () => updateSupportTicketNote(ID, "hi")],
    ["deleteSupportTicket", () => deleteSupportTicket(ID)],
  ];

  for (const role of ["user", "moderator", null]) {
    it.each(calls)(`${"%s"} rejects role ${role}`, async (_name, call) => {
      mocks.role = role;
      await expect(call()).rejects.toThrow();
      expect(mocks.set).not.toHaveBeenCalled();
      expect(mocks.where).not.toHaveBeenCalled();
    });
  }

  it("reports zero open tickets to non-admins instead of querying", async () => {
    mocks.role = "moderator";
    expect(await countOpenSupportTickets()).toBe(0);
    expect(mocks.where).not.toHaveBeenCalled();
  });
});

describe("listSupportTickets", () => {
  it("always excludes soft-deleted tickets", async () => {
    await listSupportTickets({});
    expect(render(mocks.where.mock.calls[0][0]).sql).toContain('"deleted_at" is null');
  });

  it("filters by status", async () => {
    await listSupportTickets({ status: "in_progress" });
    expect(render(mocks.where.mock.calls[0][0]).params).toContain("in_progress");
  });

  it("searches name, email and message with escaped wildcards", async () => {
    await listSupportTickets({ search: "50%_off" });
    const { sql, params } = render(mocks.where.mock.calls[0][0]);
    expect(params).toContain("%50\\%\\_off%");
    expect(sql).toMatch(/"name" ilike/);
    expect(sql).toMatch(/"email" ilike/);
    expect(sql).toMatch(/"message" ilike/);
  });

  it("ignores an unknown status", async () => {
    await listSupportTickets({ status: "closed" });
    expect(render(mocks.where.mock.calls[0][0]).params).not.toContain("closed");
  });

  it("pages with the requested page size", async () => {
    mocks.rows = [];
    const result = await listSupportTickets({ page: "3", pageSize: "10" });
    expect(mocks.limit).toHaveBeenCalledWith(10);
    expect(mocks.offset).toHaveBeenCalledWith(20);
    expect(result).toMatchObject({ page: 3, pageSize: 10 });
  });

  it("falls back to defaults for bad paging and sort input", async () => {
    await listSupportTickets({ page: "-4", pageSize: "1000", sort: "email", dir: "sideways" });
    expect(mocks.limit).toHaveBeenCalledWith(25);
    expect(mocks.offset).toHaveBeenCalledWith(0);
    expect(render(mocks.orderBy.mock.calls[0][0]).sql).toBe('"support_tickets"."created_at" desc');
  });

  it("sorts by an allowlisted column", async () => {
    await listSupportTickets({ sort: "name", dir: "asc" });
    expect(render(mocks.orderBy.mock.calls[0][0]).sql).toBe('"support_tickets"."name" asc');
  });

  it("returns only a message preview", async () => {
    mocks.rows = [{ id: ID, message: "x".repeat(1000) }];
    const result = await listSupportTickets({});
    expect(result.rows[0].message).toHaveLength(200);
  });
});

describe("updateSupportTicketStatus", () => {
  it("sets resolvedAt when resolving and writes an audit log", async () => {
    expect(await updateSupportTicketStatus(ID, "resolved")).toEqual({ success: true });
    expect(mocks.set.mock.calls[0][0]).toMatchObject({ status: "resolved" });
    expect(mocks.set.mock.calls[0][0].resolvedAt).toBeInstanceOf(Date);
    expect(mocks.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "support.status.update", targetId: ID }),
    );
  });

  it("clears resolvedAt when reopening", async () => {
    await updateSupportTicketStatus(ID, "open");
    expect(mocks.set.mock.calls[0][0]).toMatchObject({ status: "open", resolvedAt: null });
  });

  it("rejects invalid input without touching the db", async () => {
    expect(await updateSupportTicketStatus("nope", "open")).toEqual({ error: "Invalid input" });
    expect(await updateSupportTicketStatus(ID, "closed")).toEqual({ error: "Invalid input" });
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("reports a missing ticket", async () => {
    mocks.updateReturning.mockResolvedValue([]);
    expect(await updateSupportTicketStatus(ID, "open")).toEqual({ error: "Ticket not found" });
  });
});

describe("updateSupportTicketNote and deleteSupportTicket", () => {
  it("saves a trimmed note and keeps its content out of the audit log", async () => {
    expect(await updateSupportTicketNote(ID, " secret ")).toEqual({ success: true });
    expect(mocks.set.mock.calls[0][0]).toMatchObject({ internalNote: "secret" });
    expect(JSON.stringify(mocks.auditInsert.mock.calls)).not.toContain("secret");
  });

  it("soft deletes by setting deletedAt", async () => {
    expect(await deleteSupportTicket(ID)).toEqual({ success: true });
    expect(mocks.set.mock.calls[0][0].deletedAt).toBeInstanceOf(Date);
  });
});
