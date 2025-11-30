import { db } from "@/db";
import { subscriptionPlans, userSubscriptions } from "@/db/schema";
import { count, eq, ne } from "drizzle-orm";
import { StatsCard } from "@/components/admin/stats-card";
import { Users, DollarSign, TrendingUp } from "lucide-react";
import { SubscriptionPlansTable } from "@/components/admin/subscription-plans-table";
import { CreatePlanDialog } from "@/components/admin/create-plan-dialog";

export default async function SubscriptionsAdminPage() {
  const plans = await db.query.subscriptionPlans.findMany({
    orderBy: (plans, { asc }) => [asc(plans.sortOrder)],
  });

  // Stats
  const [totalSubscriptions] = await db
    .select({ count: count() })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.status, "active"));

  const [premiumUsers] = await db
    .select({ count: count() })
    .from(userSubscriptions)
    .innerJoin(
      subscriptionPlans,
      eq(userSubscriptions.planId, subscriptionPlans.id),
    )
    .where(
      eq(userSubscriptions.status, "active"),
    )
    .where(ne(subscriptionPlans.interval, "free"));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Management</h1>
          <p className="text-muted-foreground">
            Manage subscription plans and pricing
          </p>
        </div>
        <CreatePlanDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Active Subscriptions"
          value={totalSubscriptions.count}
          icon={Users}
          description="Total active subscriptions"
        />
        <StatsCard
          title="Premium Users"
          value={premiumUsers.count}
          icon={TrendingUp}
          description="Paying customers"
        />
        <StatsCard
          title="Active Plans"
          value={plans.filter((p) => p.isActive).length}
          icon={DollarSign}
          description="Available plans"
        />
      </div>

      <SubscriptionPlansTable plans={plans} />
    </div>
  );
}
