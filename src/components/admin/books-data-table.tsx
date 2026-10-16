"use client";

import Image from "next/image";
import { createColumnHelper } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { listBooksAdmin } from "@/app/[locale]/actions/admin";
import { DataTable } from "@/components/admin/data-table/data-table";
import { DataTableColumnHeader } from "@/components/admin/data-table/data-table-column-header";
import type { DataTableFeatures } from "@/components/admin/data-table/features";
import { useAdminTable } from "@/components/admin/data-table/use-admin-table";
import { booksTable, type Paged } from "@/lib/admin-table";
import { isOpenLibraryCover } from "@/lib/open-library";

type BookRow = Awaited<ReturnType<typeof listBooksAdmin>>["rows"][number];

const columnHelper = createColumnHelper<DataTableFeatures, BookRow>();

const columns = columnHelper.columns([
  columnHelper.accessor("coverUrl", {
    header: "Cover",
    cell: ({ row }) =>
      row.original.coverUrl ? (
        <Image
          src={row.original.coverUrl}
          alt={row.original.title}
          width={40}
          height={60}
          className="rounded object-cover"
          unoptimized={isOpenLibraryCover(row.original.coverUrl)}
        />
      ) : (
        <div className="flex h-15 w-10 items-center justify-center rounded bg-muted text-xs">
          —
        </div>
      ),
    enableSorting: false,
    meta: { label: "Cover", className: "w-16" },
  }),
  columnHelper.accessor("title", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    cell: ({ row }) => (
      <p className="line-clamp-2 max-w-[300px] whitespace-normal font-medium">
        {row.original.title}
      </p>
    ),
    enableHiding: false,
  }),
  columnHelper.accessor("author", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Author" />,
    cell: ({ row }) => <div className="max-w-[200px] truncate">{row.original.author}</div>,
    meta: { label: "Author" },
  }),
  columnHelper.accessor("isbn", {
    header: "ISBN",
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.isbn || "—"}</span>,
    enableSorting: false,
    meta: { label: "ISBN" },
  }),
  columnHelper.accessor("pages", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Pages" />,
    cell: ({ row }) => row.original.pages || "—",
    meta: { label: "Pages" },
  }),
  columnHelper.accessor("publishedYear", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Year" />,
    cell: ({ row }) => row.original.publishedYear || "—",
    meta: { label: "Year" },
  }),
  columnHelper.accessor("userCount", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Users" className="justify-end" />
    ),
    cell: ({ row }) => <span className="font-semibold">{row.original.userCount}</span>,
    meta: { label: "Users", className: "text-right" },
  }),
]);

export function BooksDataTable({ initial }: { initial: Paged<BookRow> }) {
  const table = useAdminTable({ definition: booksTable, initial, fetchPage: listBooksAdmin });

  return (
    <DataTable
      columns={columns}
      data={table.rows}
      getRowId={(book) => book.id}
      server={table.server}
      loading={table.loading}
      pending={table.pending}
      error={table.error}
      emptyMessage="No books found"
      toolbar={
        <Input
          type="search"
          aria-label="Search books"
          placeholder="Search title, author or ISBN"
          value={table.search}
          onChange={(e) => table.setSearch(e.target.value)}
          className="h-8 w-full max-w-sm"
        />
      }
    />
  );
}
