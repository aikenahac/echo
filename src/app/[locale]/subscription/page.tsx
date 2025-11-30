import { auth } from "@clerk/nextjs/server";
import { redirect } from "@/i18n/routing";
import { db } from "@/db";
import { users, userSubscriptions, subscriptionPlans } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { SubscriptionCard } from "@/components/subscription-card";
import { PlanSelector } from "@/components/plan-selector";
import { UsageDisplay } from "@/components/usage-display";

export default async function SubscriptionPage({ params }: { params: { locale: string } }) {
  const { userId } = await auth();
  if (!userId) {
    redirect({ href: "/", locale: params.locale });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId!),
  });

  const subscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId!),
    with: { plan: true },
  });

  // Redirect users with paid plans to settings page (including free lifetime plans)
  const hasPaidPlan = subscription?.plan && (subscription.plan.price > 0 || subscription.plan.stripePriceId !== null || subscription.plan.interval === "lifetime");
  if (hasPaidPlan) {
    redirect({ href: "/settings", locale: params.locale });
  }

  const availablePlans = await db.query.subscriptionPlans.findMany({
    where: and(
      eq(subscriptionPlans.isActive, true),
      eq(subscriptionPlans.isInternal, false)
    ),
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
          <UsageDisplay userId={userId!} />
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
