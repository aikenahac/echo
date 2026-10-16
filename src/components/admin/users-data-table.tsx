"use client";

import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import { CreditCard, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteUserAsAdmin,
  listUsersAdmin,
  updateUserRole,
} from "@/app/[locale]/actions/admin";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import { ManageUserSubscriptionDialog } from "@/components/admin/manage-user-subscription-dialog";
import { DataTable } from "@/components/admin/data-table/data-table";
import { DataTableColumnHeader } from "@/components/admin/data-table/data-table-column-header";
import { DataTableRowActions } from "@/components/admin/data-table/data-table-row-actions";
import type { DataTableFeatures } from "@/components/admin/data-table/features";
import { useAdminTable } from "@/components/admin/data-table/use-admin-table";
import { usersTable, type Paged } from "@/lib/admin-table";
import type { UserRole } from "@/lib/auth";

type UserRow = Awaited<ReturnType<typeof listUsersAdmin>>["rows"][number];

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
}

const ROLES = [
  { value: "user", label: "User" },
  { value: "moderator", label: "Moderator" },
  { value: "admin", label: "Admin" },
] as const satisfies readonly { value: UserRole; label: string }[];

const isRole = (value: string): value is UserRole => ROLES.some((role) => role.value === value);

const columnHelper = createColumnHelper<DataTableFeatures, UserRow>();

export function UsersDataTable({ initial, plans }: { initial: Paged<UserRow>; plans: Plan[] }) {
  const table = useAdminTable({ definition: usersTable, initial, fetchPage: listUsersAdmin });
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [managingUser, setManagingUser] = useState<UserRow | null>(null);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setBusyUserId(userId);
    try {
      const result = await updateUserRole(userId, role);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User role updated successfully");
        table.refresh();
      }
    } catch {
      toast.error("Failed to update user role");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDelete = async (user: UserRow) => {
    if (!confirm(`Are you sure you want to delete user ${user.email}? This action cannot be undone.`)) {
      return;
    }
    setBusyUserId(user.id);
    try {
      const result = await deleteUserAsAdmin(user.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User deleted successfully");
        table.refresh();
      }
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setBusyUserId(null);
    }
  };

  const columns = columnHelper.columns([
    columnHelper.accessor("email", {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => (
        <div className="max-w-[260px] truncate font-medium">{row.original.email}</div>
      ),
      enableHiding: false,
    }),
    columnHelper.accessor("username", {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Username" />,
      cell: ({ row }) => (
        <div className="max-w-[160px] truncate">{row.original.username || "—"}</div>
      ),
      meta: { label: "Username" },
    }),
    columnHelper.display({
      id: "subscription",
      header: "Subscription",
      cell: ({ row }) => {
        const subscription = row.original.subscription;
        const active = subscription?.status === "active" || subscription?.status === "trialing";
        return (
          <Badge variant={active ? "default" : "secondary"}>
            {subscription?.plan.name || "Free"}
          </Badge>
        );
      },
      meta: { label: "Subscription" },
    }),
    columnHelper.accessor("role", {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }) => {
        const role = row.original.role;
        return (
          <Badge
            variant={role === "admin" ? "default" : role === "moderator" ? "secondary" : "outline"}
          >
            {role}
          </Badge>
        );
      },
      meta: { label: "Role" },
    }),
    columnHelper.accessor("createdAt", {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Joined" />,
      cell: ({ row }) => (
        <span suppressHydrationWarning>{format(new Date(row.original.createdAt), "d MMM yyyy")}</span>
      ),
      meta: { label: "Joined" },
    }),
    columnHelper.display({
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DataTableRowActions busy={busyUserId === user.id}>
            <DropdownMenuItem onClick={() => setEditingUser(user)}>
              <Pencil />
              Edit user
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setManagingUser(user)}>
              <CreditCard />
              Manage subscription
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ShieldCheck />
                Role
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={user.role}
                  onValueChange={(value) => {
                    if (isRole(value) && value !== user.role) handleRoleChange(user.id, value);
                  }}
                >
                  {ROLES.map((role) => (
                    <DropdownMenuRadioItem key={role.value} value={role.value}>
                      {role.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(user)}>
              <Trash2 />
              Delete user
            </DropdownMenuItem>
          </DataTableRowActions>
        );
      },
      meta: { className: "w-12" },
      enableHiding: false,
    }),
  ]);

  return (
    <>
      <DataTable
        columns={columns}
        data={table.rows}
        getRowId={(user) => user.id}
        server={table.server}
        loading={table.loading}
        pending={table.pending}
        error={table.error}
        emptyMessage="No users found"
        toolbar={
          <>
            <Input
              type="search"
              aria-label="Search users"
              placeholder="Search email or username"
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
              className="h-8 w-full max-w-sm"
            />
            <Select
              value={table.query.filters.role ?? "all"}
              onValueChange={(value) => table.setFilter("role", isRole(value) ? value : undefined)}
            >
              <SelectTrigger size="sm" className="w-[150px]" aria-label="Filter by role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open
          onOpenChange={(open) => {
            if (open) return;
            setEditingUser(null);
            table.refresh();
          }}
        />
      )}

      {managingUser && (
        <ManageUserSubscriptionDialog
          user={managingUser}
          plans={plans}
          open
          onOpenChange={(open) => {
            if (open) return;
            setManagingUser(null);
            table.refresh();
          }}
        />
      )}
    </>
  );
}
