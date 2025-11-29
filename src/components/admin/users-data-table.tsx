"use client";

import { useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { updateUserRole, deleteUserAsAdmin } from "@/app/[locale]/actions/admin";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import { toast } from "sonner";
import { Trash2, Loader2, Pencil } from "lucide-react";

interface User {
  id: string;
  email: string;
  username: string | null;
  bio: string | null;
  role: "user" | "moderator" | "admin";
  isPremium: boolean;
  createdAt: Date;
}

export function UsersDataTable({ data }: { data: User[] }) {
  const [filter, setFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredData = data.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(filter.toLowerCase()) ||
      user.username?.toLowerCase().includes(filter.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const virtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 73, // Estimated row height in pixels
    overscan: 5, // Render 5 extra rows above and below visible area
  });

  const items = virtualizer.getVirtualItems();

  // Define column widths for alignment
  const columnWidths = {
    email: "280px",
    username: "180px",
    role: "120px",
    joined: "140px",
    actions: "340px",
  };

  const totalWidth = Object.values(columnWidths).reduce((acc, width) => {
    return acc + parseInt(width);
  }, 0);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoadingUserId(userId);
    try {
      const result = await updateUserRole(userId, newRole as any);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User role updated successfully");
      }
    } catch (error) {
      toast.error("Failed to update user role");
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (
      !confirm(
        `Are you sure you want to delete user ${email}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const result = await deleteUserAsAdmin(userId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User deleted successfully");
      }
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Search users..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${totalWidth}px` }}>
            <Table style={{ tableLayout: "fixed", width: `${totalWidth}px` }}>
              <TableHeader className="sticky top-0 bg-background z-10 border-b">
                <TableRow>
                  <TableHead style={{ width: columnWidths.email }}>Email</TableHead>
                  <TableHead style={{ width: columnWidths.username }}>Username</TableHead>
                  <TableHead style={{ width: columnWidths.role }}>Role</TableHead>
                  <TableHead style={{ width: columnWidths.joined }}>Joined</TableHead>
                  <TableHead style={{ width: columnWidths.actions }} className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
            </Table>

            {filteredData.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No users found
              </div>
            ) : (
              <div
                ref={parentRef}
                className="overflow-y-auto overflow-x-hidden"
                style={{ height: "calc(100vh - 350px)" }} // Fixed height for virtualization
              >
                <Table style={{ tableLayout: "fixed", width: `${totalWidth}px` }}>
                  <TableBody
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      position: "relative",
                    }}
                  >
                    {items.map((virtualRow) => {
                      const user = filteredData[virtualRow.index];
                      return (
                        <TableRow
                          key={user.id}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <TableCell style={{ width: columnWidths.email }} className="font-medium">
                            <div className="truncate">{user.email}</div>
                          </TableCell>
                          <TableCell style={{ width: columnWidths.username }}>
                            <div className="truncate">{user.username || "—"}</div>
                          </TableCell>
                          <TableCell style={{ width: columnWidths.role }}>
                            <Badge
                              variant={
                                user.role === "admin"
                                  ? "default"
                                  : user.role === "moderator"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell style={{ width: columnWidths.joined }}>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell style={{ width: columnWidths.actions }} className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Select
                                defaultValue={user.role}
                                onValueChange={(value) => handleRoleChange(user.id, value)}
                                disabled={loadingUserId === user.id}
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="moderator">Moderator</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setEditingUser(user)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                disabled={deletingUserId === user.id}
                              >
                                {deletingUserId === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredData.length} of {data.length} users
      </div>

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
        />
      )}
    </div>
  );
}
