"use client";

import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, RotateCcw, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteReviewAsAdmin } from "@/app/[locale]/actions/admin";
import {
  listReportsAdmin,
  reopenReport,
  resolveReport,
} from "@/app/[locale]/actions/reports-admin";
import { DataTable } from "@/components/admin/data-table/data-table";
import { DataTableColumnHeader } from "@/components/admin/data-table/data-table-column-header";
import { DataTableRowActions } from "@/components/admin/data-table/data-table-row-actions";
import type { DataTableFeatures } from "@/components/admin/data-table/features";
import { useAdminTable } from "@/components/admin/data-table/use-admin-table";
import { reportsTable, type Paged } from "@/lib/admin-table";
import {
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  type ReportStatus,
} from "@/lib/reports";

type ReportRow = Awaited<ReturnType<typeof listReportsAdmin>>["rows"][number];

const columnHelper = createColumnHelper<DataTableFeatures, ReportRow>();

const STATUS_VARIANT: Record<ReportStatus, "default" | "secondary" | "outline"> = {
  open: "default",
  resolved: "secondary",
  dismissed: "outline",
};

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export function ReportsDataTable({ initial }: { initial: Paged<ReportRow> }) {
  const table = useAdminTable({
    definition: reportsTable,
    initial,
    fetchPage: listReportsAdmin,
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (
    id: string,
    action: () => Promise<{ error?: string; success?: boolean }>,
    successMessage: string,
  ) => {
    setBusyId(id);
    try {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(successMessage);
        table.refresh();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  const close = (report: ReportRow, status: "resolved" | "dismissed") => {
    // Cancel aborts; an empty note is fine
    const note = window.prompt(
      `Optional note for the ${status === "resolved" ? "resolution" : "dismissal"}:`,
      "",
    );
    if (note === null) return;
    return run(
      report.id,
      () => resolveReport(report.id, status, note),
      `Report ${status}`,
    );
  };

  const deleteReview = (report: ReportRow) => {
    if (!confirm("Delete the reported review? This cannot be undone.")) return;
    return run(
      report.id,
      async () => {
        const result = await deleteReviewAsAdmin(report.targetId);
        if (result.error) return result;
        return resolveReport(report.id, "resolved", "Review deleted");
      },
      "Review deleted and report resolved",
    );
  };

  const columns = columnHelper.columns([
    columnHelper.accessor("targetType", {
      header: "Type",
      cell: ({ row }) => <Badge variant="outline">{capitalize(row.original.targetType)}</Badge>,
      enableSorting: false,
      meta: { label: "Type" },
    }),
    columnHelper.accessor((report) => report.target.username ?? report.target.id, {
      id: "target",
      header: "Reported user",
      cell: ({ getValue }) => <div className="max-w-[180px] truncate font-medium">{getValue()}</div>,
      enableSorting: false,
      enableHiding: false,
    }),
    columnHelper.accessor("reason", {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reason" />,
      cell: ({ row }) => capitalize(row.original.reason),
      meta: { label: "Reason" },
    }),
    columnHelper.display({
      id: "details",
      header: "Details",
      cell: ({ row }) => (
        <div className="max-w-md space-y-1 whitespace-normal">
          {row.original.contentSnapshot ? (
            <p className="line-clamp-2 italic">“{row.original.contentSnapshot}”</p>
          ) : null}
          {row.original.details ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{row.original.details}</p>
          ) : null}
          {row.original.resolutionNote ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              Note: {row.original.resolutionNote}
            </p>
          ) : null}
        </div>
      ),
      meta: { label: "Details" },
    }),
    columnHelper.accessor((report) => report.reporter.username ?? report.reporter.id, {
      id: "reporter",
      header: "Reported by",
      cell: ({ getValue }) => <div className="max-w-[160px] truncate">{getValue()}</div>,
      enableSorting: false,
      meta: { label: "Reported by" },
    }),
    columnHelper.accessor("status", {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]}>{capitalize(row.original.status)}</Badge>
      ),
      meta: { label: "Status" },
    }),
    columnHelper.accessor("createdAt", {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reported" />,
      cell: ({ row }) => (
        <span suppressHydrationWarning>{format(new Date(row.original.createdAt), "d MMM yyyy")}</span>
      ),
      meta: { label: "Reported" },
    }),
    columnHelper.display({
      id: "actions",
      cell: ({ row }) => {
        const report = row.original;
        return (
          <DataTableRowActions busy={busyId === report.id}>
            {report.status === "open" ? (
              <>
                <DropdownMenuItem onClick={() => close(report, "resolved")}>
                  <Check />
                  Mark resolved
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => close(report, "dismissed")}>
                  <X />
                  Dismiss
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                onClick={() => run(report.id, () => reopenReport(report.id), "Report reopened")}
              >
                <RotateCcw />
                Reopen
              </DropdownMenuItem>
            )}
            {report.targetType === "review" ? (
              <DropdownMenuItem variant="destructive" onClick={() => deleteReview(report)}>
                <Trash2 />
                Delete review
              </DropdownMenuItem>
            ) : null}
          </DataTableRowActions>
        );
      },
      meta: { className: "w-12" },
      enableHiding: false,
    }),
  ]);

  return (
    <DataTable
      columns={columns}
      data={table.rows}
      getRowId={(report) => report.id}
      server={table.server}
      loading={table.loading}
      pending={table.pending}
      error={table.error}
      emptyMessage="No reports found"
      toolbar={
        <>
          <Input
            type="search"
            aria-label="Search reports"
            placeholder="Search users, details or review text"
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            className="h-8 w-full max-w-sm"
          />
          <Select
            value={table.query.filters.status ?? "all"}
            onValueChange={(value) =>
              table.setFilter(
                "status",
                REPORT_STATUSES.find((status) => status === value),
              )
            }
          >
            <SelectTrigger size="sm" className="w-[150px]" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {REPORT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {capitalize(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={table.query.filters.type ?? "all"}
            onValueChange={(value) =>
              table.setFilter(
                "type",
                REPORT_TARGET_TYPES.find((type) => type === value),
              )
            }
          >
            <SelectTrigger size="sm" className="w-[150px]" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {REPORT_TARGET_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {capitalize(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
    />
  );
}
