import { redirect } from "@/i18n/routing";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { SubscriptionCard } from "@/components/subscription-card";
import { PlanSelector } from "@/components/plan-selector";
import { getViewer, isPaidPlan } from "@/lib/auth";

export default async function SubscriptionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [viewer, availablePlans] = await Promise.all([
    getViewer(),
    db.query.subscriptionPlans.findMany({
      where: and(
        eq(subscriptionPlans.isActive, true),
        eq(subscriptionPlans.isInternal, false)
      ),
      orderBy: [asc(subscriptionPlans.sortOrder)],
    }),
  ]);
  if (!viewer) {
    redirect({ href: "/", locale });
  }

  const subscription = viewer?.subscription ?? undefined;

  // Redirect users with paid plans to settings page (including free lifetime plans)
  if (isPaidPlan(subscription?.plan)) {
    redirect({ href: "/settings", locale });
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <h1 className="text-4xl font-bold mb-2">Subscription</h1>
      <p className="text-muted-foreground mb-8">
        Manage your subscription
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Current Subscription */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Current Plan</h2>
          <SubscriptionCard subscription={subscription} />
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
