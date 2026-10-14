import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { PlanSelector } from "@/components/plan-selector";
import { PremiumPitch } from "@/components/plans/premium-pitch";
import { getViewer, isPaidPlan } from "@/lib/auth";
import { isLemonSqueezyConfigured } from "@/lib/lemonsqueezy";

export async function generateMetadata() {
  const t = await getTranslations("plans");
  return { title: t("title") };
}

export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [viewer, availablePlans] = await Promise.all([
    getViewer(),
    db.query.subscriptionPlans.findMany({
      where: and(
        eq(subscriptionPlans.isActive, true),
        eq(subscriptionPlans.isInternal, false),
      ),
      orderBy: [asc(subscriptionPlans.sortOrder)],
    }),
  ]);
  if (!viewer) {
    redirect({ href: "/", locale });
  }

  const subscription = viewer?.subscription ?? undefined;

  // Paid plans (including free lifetime plans) are managed in Settings
  if (isPaidPlan(subscription?.plan)) {
    redirect({ href: "/settings", locale });
  }

  return (
    <section className="on-field min-h-dvh bg-field">
      <div className="mx-auto grid w-full max-w-[1180px] gap-10 px-5 pt-[max(24px,env(safe-area-inset-top))] pb-12 md:px-10 md:pt-16 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-20">
        <PremiumPitch />
        <PlanSelector
          plans={availablePlans}
          currentPlanId={subscription?.planId}
          comingSoon={!isLemonSqueezyConfigured()}
        />
      </div>
    </section>
  );
}
