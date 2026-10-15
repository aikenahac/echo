"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listSupportTickets } from "@/app/[locale]/actions/support-admin";
import { SupportStatusBadge } from "@/components/admin/support-status-badge";
import { cn } from "@/lib/utils";
import { SUPPORT_STATUSES, type SupportStatus } from "@/lib/support";

export type TicketRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: SupportStatus;
  createdAt: Date;
};

type ListData = { tickets: TicketRow[]; total: number; page: number; pageCount: number };

const FILTERS: { label: string; value: SupportStatus | undefined }[] = [
  { label: "All", value: undefined },
  ...SUPPORT_STATUSES.map((value) => ({
    label: value === "in_progress" ? "In progress" : value[0].toUpperCase() + value.slice(1),
    value,
  })),
];

function pageHref(status: SupportStatus | undefined, page: number) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/support${query ? `?${query}` : ""}`;
}

/**
 * Status filter and page live in the URL. The search term deliberately does
 * not: it is sent through a server action so it never lands in access logs.
 */
export function SupportTicketList({
  initial,
  status,
}: {
  initial: ListData;
  status: SupportStatus | undefined;
}) {
  const [search, setSearch] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [results, setResults] = useState<(ListData & { key: string }) | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  const searching = search.trim() !== "";
  const key = `${status ?? ""}|${search}|${searchPage}`;
  // Loading/failed are derived from which request last settled, not set in the effect
  const loading = searching && results?.key !== key && failedKey !== key;
  const failed = searching && failedKey === key;

  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await listSupportTickets({ status, search, page: searchPage });
        if (cancelled) return;
        if ("error" in result) setFailedKey(key);
        else setResults({ ...result, key });
      } catch {
        if (!cancelled) setFailedKey(key);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, searchPage, searching, status, key]);

  const data = searching ? results : initial;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1" role="group" aria-label="Filter by status">
          {FILTERS.map((filter) => (
            <Button
              key={filter.label}
              asChild
              size="sm"
              variant={filter.value === status ? "default" : "outline"}
            >
              <Link href={pageHref(filter.value, 1)}>{filter.label}</Link>
            </Button>
          ))}
        </div>
        <Input
          type="search"
          aria-label="Search tickets"
          placeholder="Search name, email or message"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSearchPage(1);
          }}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {failed ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-destructive">
                  Failed to load tickets. Try again.
                </TableCell>
              </TableRow>
            ) : loading && !results ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : !data || data.tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No tickets found
                </TableCell>
              </TableRow>
            ) : (
              data.tickets.map((ticket) => (
                <TableRow key={ticket.id} className={cn(loading && "opacity-60")}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/support/${ticket.id}`} className="hover:underline">
                      {ticket.name}
                    </Link>
                  </TableCell>
                  <TableCell>{ticket.email}</TableCell>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-1">{ticket.message}</p>
                  </TableCell>
                  <TableCell>
                    <SupportStatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell suppressHydrationWarning>
                    {format(new Date(ticket.createdAt), "d MMM yyyy")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.total} ticket{data.total === 1 ? "" : "s"} · page {data.page} of{" "}
            {data.pageCount}
          </span>
          <div className="flex gap-2">
            {searching ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={data.page <= 1}
                  onClick={() => setSearchPage(data.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={data.page >= data.pageCount}
                  onClick={() => setSearchPage(data.page + 1)}
                >
                  Next
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="sm" variant="outline" disabled={data.page <= 1}>
                  <Link
                    href={pageHref(status, data.page - 1)}
                    aria-disabled={data.page <= 1}
                    className={cn(data.page <= 1 && "pointer-events-none opacity-50")}
                  >
                    Previous
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" disabled={data.page >= data.pageCount}>
                  <Link
                    href={pageHref(status, data.page + 1)}
                    aria-disabled={data.page >= data.pageCount}
                    className={cn(
                      data.page >= data.pageCount && "pointer-events-none opacity-50",
                    )}
                  >
                    Next
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
