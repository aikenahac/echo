import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { UsersDataTable } from "@/components/admin/users-data-table";
import { listUsersAdmin } from "@/app/[locale]/actions/admin";
import type { RawTableParams } from "@/lib/admin-table";
import { asc } from "drizzle-orm";

export default async function UsersManagementPage({
  searchParams,
}: {
  searchParams: Promise<RawTableParams>;
}) {
  const [initial, plans] = await Promise.all([
    searchParams.then(listUsersAdmin),
    db.query.subscriptionPlans.findMany({
      columns: { id: true, name: true, price: true, interval: true },
      orderBy: [asc(subscriptionPlans.sortOrder)],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, roles, and subscriptions
        </p>
      </div>

      <UsersDataTable initial={initial} plans={plans} />
    </div>
  );
}
