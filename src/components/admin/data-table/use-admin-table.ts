"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { functionalUpdate } from "@tanstack/react-table";
import type {
  Paged,
  RawTableParams,
  TableDefinition,
  TableQuery,
} from "@/lib/admin-table";
import type { ServerTableState } from "./data-table";

/**
 * Page, page size, sort and filters live in the URL, so the server page
 * renders them. The search term stays in component state and is sent through
 * `fetchPage` (a server action), keeping it out of URLs and access logs.
 */
export function useAdminTable<TSort extends string, TFilters, TRow>({
  definition,
  initial,
  fetchPage,
}: {
  definition: TableDefinition<TSort, TFilters>;
  initial: Paged<TRow>;
  fetchPage: (params: RawTableParams) => Promise<Paged<TRow> | { error: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, startTransition] = useTransition();

  const urlKey = searchParams.toString();
  const query = definition.parse(Object.fromEntries(searchParams));

  function navigate(next: Omit<TableQuery<TSort, TFilters>, "search">) {
    const params = definition.toSearchParams(next).toString();
    startTransition(() => {
      router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
    });
  }

  const [search, setSearchValue] = useState("");
  const [nonce, setNonce] = useState(0);
  const [results, setResults] = useState<{ key: string; data: Paged<TRow> } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  const term = search.trim();
  const searching = term !== "";
  const key = `${urlKey}|${term}|${nonce}`;
  // Loading/failed are derived from which request last settled, not set in the effect
  const searchLoading = searching && results?.key !== key && failedKey !== key;
  const searchFailed = searching && failedKey === key;

  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const params = Object.fromEntries(new URLSearchParams(urlKey));
        const result = await fetchPage({ ...params, search: term });
        if (cancelled) return;
        if ("error" in result) setFailedKey(key);
        else setResults({ key, data: result });
      } catch {
        if (!cancelled) setFailedKey(key);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fetchPage, key, searching, term, urlKey]);

  const data = searching ? (results?.data ?? null) : initial;

  const server: ServerTableState = {
    rowCount: data?.total ?? 0,
    pagination: { pageIndex: query.page - 1, pageSize: query.pageSize },
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, {
        pageIndex: query.page - 1,
        pageSize: query.pageSize,
      });
      const resized = next.pageSize !== query.pageSize;
      navigate({ ...query, pageSize: next.pageSize, page: resized ? 1 : next.pageIndex + 1 });
    },
    sorting: [query.sort],
    onSortingChange: (updater) => {
      const [next] = functionalUpdate(updater, [query.sort]);
      // Re-parse so only the table's allowlisted sort columns get through
      const { sort } = definition.parse({ sort: next?.id, dir: next?.desc ? "desc" : "asc" });
      navigate({ ...query, sort, page: 1 });
    },
  };

  return {
    query,
    rows: data?.rows ?? [],
    server,
    loading: data === null && searchLoading,
    pending: navigating || searchLoading,
    error: searchFailed ? "Failed to load results. Try again." : null,
    search,
    setSearch: (value: string) => {
      setSearchValue(value);
      if (query.page > 1) navigate({ ...query, page: 1 });
    },
    setFilter: <K extends keyof TFilters>(name: K, value: TFilters[K] | undefined) => {
      navigate({ ...query, filters: { ...query.filters, [name]: value }, page: 1 });
    },
    /** Re-fetch after a mutation, including active search results */
    refresh: () => {
      router.refresh();
      setNonce((n) => n + 1);
    },
  };
}
