import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { asc, and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { Link, redirect } from "@/i18n/routing";
import { Capsule } from "@/components/echo/buttons";
import { EchoMark } from "@/components/echo/icons";
import { Footer } from "@/components/footer";
import { PremiumPitch } from "@/components/plans/premium-pitch";
import { formatPlanPrice } from "@/components/plans/plan-price";

export const metadata = {
  title: "Pricing",
  description:
    "Echo is free, with no limit on books. Premium adds collections you name yourself.",
};

const FAQ = ["upgrade", "limit", "refunds", "payment"] as const;

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Signed-in readers pick a plan on the subscription page
  const { userId } = await auth();
  if (userId) {
    redirect({ href: "/subscription", locale });
  }

  const [t, tFaq, plans] = await Promise.all([
    getTranslations("plans"),
    getTranslations("pricing.faq"),
    db.query.subscriptionPlans.findMany({
      where: and(
        eq(subscriptionPlans.isActive, true),
        eq(subscriptionPlans.isInternal, false),
      ),
      orderBy: [asc(subscriptionPlans.sortOrder)],
    }),
  ]);
  const paid = plans.filter((p) => p.price > 0);

  return (
    <>
      <section className="on-field bg-field">
        <div className="mx-auto w-full max-w-[1180px] px-5 pt-[max(20px,env(safe-area-inset-top))] pb-12 md:px-10 md:pb-20">
          <header className="flex h-12 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <EchoMark height={28} />
              <span className="font-disp text-[22px] leading-none md:text-[26px]">Echo</span>
            </Link>
            <Link href="/sign-in" className="text-[15px] font-semibold hover:underline">
              {t("signIn")}
            </Link>
          </header>
          <div className="mt-10 grid gap-12 md:mt-16 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-20">
            <PremiumPitch />
            <div>
              <ul>
                <li className="border-t border-[var(--on-field-rule)] py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-disp text-[28px] font-extrabold">{t("freeName")}</span>
                    <span className="text-[17px] font-semibold tnum">{t("freePrice")}</span>
                  </div>
                  <p className="mt-1 text-[15px] leading-5 text-on-field-2">{t("freeLine")}</p>
                </li>
                {paid.map((plan) => {
                  const { price, per } = formatPlanPrice(plan, (k) => t(k));
                  return (
                    <li key={plan.id} className="border-t border-[var(--on-field-rule)] py-4">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="font-disp text-[28px] font-extrabold">{plan.name}</span>
                        <span className="text-right text-[17px] font-semibold tnum">
                          {price} <span className="font-normal text-on-field-2">{per}</span>
                        </span>
                      </div>
                      <p className="mt-1 text-[15px] leading-5 text-on-field-2">{t("premiumLine")}</p>
                    </li>
                  );
                })}
              </ul>
              <Capsule asChild variant="field" size="lg" className="mt-4 w-full">
                <Link href="/sign-up">{t("startFree")}</Link>
              </Capsule>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto w-full max-w-[760px] px-5 py-12 md:px-10 md:py-16">
        <h2 className="font-disp text-[28px] leading-none font-extrabold">{t("faqTitle")}</h2>
        <dl className="mt-4">
          {FAQ.map((q) => (
            <div key={q} className="py-4 [&+div]:hairline-t">
              <dt className="text-[17px] font-semibold">{tFaq(`questions.${q}.title`)}</dt>
              <dd className="mt-1 text-[15px] leading-[21px] text-ink-2">
                {tFaq(`questions.${q}.answer`)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <Footer />
    </>
  );
}
