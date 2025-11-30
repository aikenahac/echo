import { db } from "@/db";
import { users, subscriptionPlans } from "@/db/schema";
import { UsersDataTable } from "@/components/admin/users-data-table";
import { desc, asc } from "drizzle-orm";

export default async function UsersManagementPage() {
  const allUsers = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
    with: {
      subscription: {
        with: {
          plan: true,
        },
      },
    },
  });

  const plans = await db.query.subscriptionPlans.findMany({
    orderBy: [asc(subscriptionPlans.sortOrder)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, roles, and subscriptions
        </p>
      </div>

      <UsersDataTable data={allUsers} plans={plans} />
    </div>
  );
}
