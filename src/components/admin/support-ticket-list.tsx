"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listSupportTickets } from "@/app/[locale]/actions/support-admin";
import { SupportStatusBadge } from "@/components/admin/support-status-badge";
import { DataTable } from "@/components/admin/data-table/data-table";
import { DataTableColumnHeader } from "@/components/admin/data-table/data-table-column-header";
import type { DataTableFeatures } from "@/components/admin/data-table/features";
import { useAdminTable } from "@/components/admin/data-table/use-admin-table";
import { supportTable, type Paged } from "@/lib/admin-table";
import { SUPPORT_STATUSES, type SupportStatus } from "@/lib/support";

type TicketRow = Awaited<ReturnType<typeof listSupportTickets>>["rows"][number];

const FILTERS: { label: string; value: SupportStatus | undefined }[] = [
  { label: "All", value: undefined },
  ...SUPPORT_STATUSES.map((value) => ({
    label: value === "in_progress" ? "In progress" : value[0].toUpperCase() + value.slice(1),
    value,
  })),
];

const columnHelper = createColumnHelper<DataTableFeatures, TicketRow>();

const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <Link href={`/admin/support/${row.original.id}`} className="font-medium hover:underline">
        {row.original.name}
      </Link>
    ),
    enableHiding: false,
  }),
  columnHelper.accessor("email", {
    header: "Email",
    enableSorting: false,
    meta: { label: "Email" },
  }),
  columnHelper.accessor("message", {
    header: "Message",
    cell: ({ row }) => <p className="line-clamp-1 max-w-md whitespace-normal">{row.original.message}</p>,
    enableSorting: false,
    meta: { label: "Message" },
  }),
  columnHelper.accessor("status", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <SupportStatusBadge status={row.original.status} />,
    meta: { label: "Status" },
  }),
  columnHelper.accessor("createdAt", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => (
      <span suppressHydrationWarning>{format(new Date(row.original.createdAt), "d MMM yyyy")}</span>
    ),
    meta: { label: "Created" },
  }),
]);

export function SupportTicketList({ initial }: { initial: Paged<TicketRow> }) {
  const table = useAdminTable({ definition: supportTable, initial, fetchPage: listSupportTickets });
  const status = table.query.filters.status;

  return (
    <DataTable
      columns={columns}
      data={table.rows}
      getRowId={(ticket) => ticket.id}
      server={table.server}
      loading={table.loading}
      pending={table.pending}
      error={table.error}
      emptyMessage="No tickets found"
      toolbar={
        <>
          <div className="flex gap-1" role="group" aria-label="Filter by status">
            {FILTERS.map((filter) => (
              <Button
                key={filter.label}
                size="sm"
                variant={filter.value === status ? "default" : "outline"}
                aria-pressed={filter.value === status}
                onClick={() => table.setFilter("status", filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <Input
            type="search"
            aria-label="Search tickets"
            placeholder="Search name, email or message"
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            className="h-8 w-full max-w-sm"
          />
        </>
      }
    />
  );
}
