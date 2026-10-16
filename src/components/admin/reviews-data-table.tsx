"use client";

import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { deleteReviewAsAdmin, listReviewsAdmin } from "@/app/[locale]/actions/admin";
import { DataTable } from "@/components/admin/data-table/data-table";
import { DataTableColumnHeader } from "@/components/admin/data-table/data-table-column-header";
import { DataTableRowActions } from "@/components/admin/data-table/data-table-row-actions";
import type { DataTableFeatures } from "@/components/admin/data-table/features";
import { useAdminTable } from "@/components/admin/data-table/use-admin-table";
import { reviewsTable, type Paged } from "@/lib/admin-table";

type ReviewRow = Awaited<ReturnType<typeof listReviewsAdmin>>["rows"][number];

const columnHelper = createColumnHelper<DataTableFeatures, ReviewRow>();

export function ReviewsDataTable({ initial }: { initial: Paged<ReviewRow> }) {
  const table = useAdminTable({ definition: reviewsTable, initial, fetchPage: listReviewsAdmin });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
      return;
    }
    setDeletingId(reviewId);
    try {
      const result = await deleteReviewAsAdmin(reviewId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Review deleted successfully");
        table.refresh();
      }
    } catch {
      toast.error("Failed to delete review");
    } finally {
      setDeletingId(null);
    }
  };

  const columns = columnHelper.columns([
    columnHelper.accessor((review) => review.user.username || review.user.email, {
      id: "user",
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ getValue }) => <div className="max-w-[200px] truncate font-medium">{getValue()}</div>,
      enableHiding: false,
    }),
    columnHelper.accessor((review) => review.book.title, {
      id: "book",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Book" />,
      cell: ({ row }) => (
        <div className="max-w-[240px]">
          <div className="truncate font-medium">{row.original.book.title}</div>
          <div className="truncate text-sm text-muted-foreground">by {row.original.book.author}</div>
        </div>
      ),
      meta: { label: "Book" },
    }),
    columnHelper.accessor("content", {
      header: "Content",
      cell: ({ row }) => (
        <p className="line-clamp-2 max-w-md whitespace-normal">{row.original.content}</p>
      ),
      enableSorting: false,
      meta: { label: "Content" },
    }),
    columnHelper.accessor("isPrivate", {
      header: "Visibility",
      cell: ({ row }) => (
        <Badge variant={row.original.isPrivate ? "secondary" : "default"}>
          {row.original.isPrivate ? "Private" : "Public"}
        </Badge>
      ),
      enableSorting: false,
      meta: { label: "Visibility" },
    }),
    columnHelper.accessor("createdAt", {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => (
        <span suppressHydrationWarning>{format(new Date(row.original.createdAt), "d MMM yyyy")}</span>
      ),
      meta: { label: "Created" },
    }),
    columnHelper.display({
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions busy={deletingId === row.original.id}>
          <DropdownMenuItem variant="destructive" onClick={() => handleDelete(row.original.id)}>
            <Trash2 />
            Delete review
          </DropdownMenuItem>
        </DataTableRowActions>
      ),
      meta: { className: "w-12" },
      enableHiding: false,
    }),
  ]);

  return (
    <DataTable
      columns={columns}
      data={table.rows}
      getRowId={(review) => review.id}
      server={table.server}
      loading={table.loading}
      pending={table.pending}
      error={table.error}
      emptyMessage="No reviews found"
      toolbar={
        <>
          <Input
            type="search"
            aria-label="Search reviews"
            placeholder="Search review, book or user"
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            className="h-8 w-full max-w-sm"
          />
          <Select
            value={table.query.filters.visibility ?? "all"}
            onValueChange={(value) =>
              table.setFilter(
                "visibility",
                value === "public" || value === "private" ? value : undefined,
              )
            }
          >
            <SelectTrigger size="sm" className="w-[150px]" aria-label="Filter by visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reviews</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </>
      }
    />
  );
}
