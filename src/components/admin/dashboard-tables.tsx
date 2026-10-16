"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table/data-table";
import type { DataTableFeatures } from "@/components/admin/data-table/features";

type PopularBook = { id: string; title: string; author: string; userCount: number };
type RecentUser = { id: string; email: string; username: string | null; role: string };

const bookColumn = createColumnHelper<DataTableFeatures, PopularBook>();
const popularBookColumns = bookColumn.columns([
  bookColumn.accessor("title", {
    header: "Title",
    cell: ({ row }) => <div className="max-w-[220px] truncate font-medium">{row.original.title}</div>,
  }),
  bookColumn.accessor("author", {
    header: "Author",
    cell: ({ row }) => <div className="max-w-[160px] truncate">{row.original.author}</div>,
  }),
  bookColumn.accessor("userCount", {
    header: "Users",
    meta: { className: "text-right" },
  }),
]);

const userColumn = createColumnHelper<DataTableFeatures, RecentUser>();
const recentUserColumns = userColumn.columns([
  userColumn.accessor("email", {
    header: "Email",
    cell: ({ row }) => <div className="max-w-[220px] truncate font-medium">{row.original.email}</div>,
  }),
  userColumn.accessor("username", {
    header: "Username",
    cell: ({ row }) => row.original.username || "—",
  }),
  userColumn.accessor("role", {
    header: "Role",
    cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge>,
  }),
]);

export function PopularBooksTable({ data }: { data: PopularBook[] }) {
  return (
    <DataTable
      columns={popularBookColumns}
      data={data}
      getRowId={(book) => book.id}
      emptyMessage="No books yet"
    />
  );
}

export function RecentUsersTable({ data }: { data: RecentUser[] }) {
  return (
    <DataTable
      columns={recentUserColumns}
      data={data}
      getRowId={(user) => user.id}
      emptyMessage="No users yet"
    />
  );
}
