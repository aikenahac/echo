"use client";

import { useState, type ReactNode } from "react";
import {
  useTable,
  type ColumnDef,
  type ColumnVisibilityState,
  type OnChangeFn,
  type PaginationState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions } from "./data-table-view-options";
import { features, type DataTableFeatures } from "./features";

/** Server-side paging and sorting; leave out for a static, single-page table. */
export type ServerTableState = {
  rowCount: number;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
};

export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  server,
  toolbar,
  loading = false,
  pending = false,
  error,
  emptyMessage = "No results.",
}: {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  server?: ServerTableState;
  /** Search and filter controls; the column toggle is added on the right */
  toolbar?: ReactNode;
  /** No data yet: show skeleton rows */
  loading?: boolean;
  /** New data is on its way: dim the current rows */
  pending?: boolean;
  error?: string | null;
  emptyMessage?: string;
}) {
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

  const table = useTable({
    features,
    data,
    columns,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    manualPagination: true,
    manualSorting: true,
    enableSorting: !!server,
    enableMultiSort: false,
    enableSortingRemoval: false,
    rowCount: server?.rowCount ?? data.length,
    onPaginationChange: server?.onPaginationChange,
    onSortingChange: server?.onSortingChange,
    onColumnVisibilityChange: setColumnVisibility,
    state: server
      ? { columnVisibility, pagination: server.pagination, sorting: server.sorting }
      : { columnVisibility },
  });

  const columnCount = table.getVisibleLeafColumns().length;
  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-4">
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          <DataTableViewOptions table={table} />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.columnDef.meta?.className}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className={cn(pending && "opacity-60 transition-opacity")}>
            {error ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columnCount}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {server ? <DataTablePagination table={table} /> : null}
    </div>
  );
}
