import { z } from "zod";
import type { UserRole } from "@/lib/auth";
import { SUPPORT_STATUSES } from "@/lib/support";
import { REPORT_STATUSES, REPORT_TARGET_TYPES } from "@/lib/reports";

// Shared shape of every admin list: the page, page size, sort and filters
// live in the URL; the search term never does (it is sent through a server
// action so personal data stays out of access logs).

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;
const SEARCH_MAX = 100;

export type SortState<TSort extends string> = { id: TSort; desc: boolean };

export type Paged<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type TableQuery<TSort extends string, TFilters> = {
  page: number;
  pageSize: number;
  sort: SortState<TSort>;
  search: string | undefined;
  filters: TFilters;
};

/** Raw params as they come from the URL or a list action's input. */
export type RawTableParams = Record<string, string | string[] | undefined>;

type FilterShape = Record<string, z.ZodType>;
type FilterValues<T extends FilterShape> = { [K in keyof T]?: z.output<T[K]> };

export function defineTable<
  const TSort extends readonly [string, ...string[]],
  TFilters extends FilterShape = Record<never, never>,
>(config: {
  sort: TSort;
  defaultSort: SortState<TSort[number]>;
  filters?: TFilters;
}) {
  const base = z.object({
    page: z.coerce.number().int().min(1).max(100_000).catch(1),
    pageSize: z.coerce
      .number()
      .refine((n) => PAGE_SIZES.some((size) => size === n))
      .catch(DEFAULT_PAGE_SIZE),
    sort: z.enum(config.sort).optional().catch(undefined),
    dir: z.enum(["asc", "desc"]).optional().catch(undefined),
    search: z
      .string()
      .transform((s) => s.trim().slice(0, SEARCH_MAX) || undefined)
      .optional()
      .catch(undefined),
  });
  const filterEntries = Object.entries(config.filters ?? {});
  const record = z.record(z.string(), z.unknown()).catch({});

  type Query = TableQuery<TSort[number], FilterValues<TFilters>>;

  /** Never throws: anything invalid falls back to its default. */
  function parse(raw: unknown): Query {
    const input = record.parse(raw);
    const { page, pageSize, sort, dir, search } = base.parse(input);
    const filters: Record<string, unknown> = {};
    for (const [key, schema] of filterEntries) {
      const result = schema.safeParse(input[key]);
      if (result.success) filters[key] = result.data;
    }
    return {
      page,
      pageSize,
      sort: sort
        ? { id: sort, desc: dir ? dir === "desc" : config.defaultSort.desc }
        : config.defaultSort,
      search,
      // Each key was validated by its own schema above
      filters: filters as FilterValues<TFilters>,
    };
  }

  /** URL params for a query, leaving out defaults and the search term. */
  function toSearchParams(query: Omit<Query, "search">) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query.filters)) {
      if (value !== undefined) params.set(key, String(value));
    }
    const { sort } = query;
    if (sort.id !== config.defaultSort.id || sort.desc !== config.defaultSort.desc) {
      params.set("sort", sort.id);
      params.set("dir", sort.desc ? "desc" : "asc");
    }
    if (query.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(query.pageSize));
    if (query.page > 1) params.set("page", String(query.page));
    return params;
  }

  return { parse, toSearchParams, defaultSort: config.defaultSort };
}

export type TableDefinition<TSort extends string, TFilters> = {
  parse: (raw: unknown) => TableQuery<TSort, TFilters>;
  toSearchParams: (query: Omit<TableQuery<TSort, TFilters>, "search">) => URLSearchParams;
  defaultSort: SortState<TSort>;
};

export type QueryOf<T> = T extends TableDefinition<infer S, infer F> ? TableQuery<S, F> : never;

export function paged<T>(rows: T[], total: number, query: { page: number; pageSize: number }): Paged<T> {
  return {
    rows,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export const offsetOf = (query: { page: number; pageSize: number }) =>
  (query.page - 1) * query.pageSize;

const USER_ROLES = ["user", "moderator", "admin"] as const satisfies readonly UserRole[];

export const usersTable = defineTable({
  sort: ["email", "username", "role", "createdAt"],
  defaultSort: { id: "createdAt", desc: true },
  filters: { role: z.enum(USER_ROLES) },
});

export const booksTable = defineTable({
  sort: ["title", "author", "pages", "publishedYear", "userCount"],
  defaultSort: { id: "userCount", desc: true },
});

export const reviewsTable = defineTable({
  sort: ["createdAt", "user", "book"],
  defaultSort: { id: "createdAt", desc: true },
  filters: { visibility: z.enum(["public", "private"]) },
});

export const reportsTable = defineTable({
  sort: ["createdAt", "reason", "status"],
  defaultSort: { id: "createdAt", desc: true },
  filters: {
    status: z.enum(REPORT_STATUSES),
    type: z.enum(REPORT_TARGET_TYPES),
  },
});

export const supportTable = defineTable({
  sort: ["createdAt", "name", "status"],
  defaultSort: { id: "createdAt", desc: true },
  filters: { status: z.enum(SUPPORT_STATUSES) },
});
