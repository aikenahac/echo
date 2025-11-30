import { auth } from "@clerk/nextjs/server";
import { redirect } from "@/i18n/routing";
import { db } from "@/db";
import { users, userSubscriptions, subscriptionPlans } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { SubscriptionCard } from "@/components/subscription-card";
import { PlanSelector } from "@/components/plan-selector";
import { UsageDisplay } from "@/components/usage-display";

export default async function SubscriptionPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  const subscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId),
    with: { plan: true },
  });

  const availablePlans = await db.query.subscriptionPlans.findMany({
    where: eq(subscriptionPlans.isActive, true),
    orderBy: [asc(subscriptionPlans.sortOrder)],
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <h1 className="text-4xl font-bold mb-2">Subscription</h1>
      <p className="text-muted-foreground mb-8">
        Manage your subscription and usage
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Current Subscription */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Current Plan</h2>
          <SubscriptionCard subscription={subscription} />
          <UsageDisplay userId={userId} />
        </div>

        {/* Available Plans */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Upgrade</h2>
          <PlanSelector
            plans={availablePlans}
            currentPlanId={subscription?.planId}
          />
        </div>
      </div>
    </div>
  );
}
