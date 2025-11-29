import { db } from "@/db";
import { users } from "@/db/schema";
import { UsersDataTable } from "@/components/admin/users-data-table";
import { desc } from "drizzle-orm";

export default async function UsersManagementPage() {
  const allUsers = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts and roles
        </p>
      </div>

      <UsersDataTable data={allUsers} />
    </div>
  );
}
