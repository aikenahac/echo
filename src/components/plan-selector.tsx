"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import {
  createCheckoutSession,
  upgradeToFreePlan,
} from "@/app/[locale]/actions/subscriptions";
import { Capsule } from "@/components/echo/buttons";
import { formatPlanPrice } from "@/components/plans/plan-price";
import { PLACEHOLDER_PLANS } from "@/components/plans/placeholder-plans";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  isActive: boolean;
  lemonSqueezyVariantId: string | null;
}

/** Plan rows on the field; pick one and continue to checkout. */
export function PlanSelector({
  plans,
  currentPlanId,
  comingSoon = false,
}: {
  plans: Plan[];
  currentPlanId: string | undefined;
  /** Payments aren't live yet: show placeholder paid plans, no checkout. */
  comingSoon?: boolean;
}) {
  if (comingSoon) {
    return <ComingSoonPlans currentPlanId={currentPlanId} plans={plans} />;
  }
  return <LivePlanSelector plans={plans} currentPlanId={currentPlanId} />;
}

function LivePlanSelector({
  plans,
  currentPlanId,
}: {
  plans: Plan[];
  currentPlanId: string | undefined;
}) {
  const t = useTranslations("plans");
  const router = useRouter();
  const choosable = plans.filter((p) => p.id !== currentPlanId);
  const [selected, setSelected] = useState(
    choosable.find((p) => p.interval === "month")?.id ?? choosable[0]?.id,
  );
  const [loading, setLoading] = useState(false);

  const go = async () => {
    const plan = plans.find((p) => p.id === selected);
    if (!plan) return;
    setLoading(true);
    try {
      // Free plans (no Lemon Squeezy variant) are claimed directly
      if (!plan.lemonSqueezyVariantId) {
        const result = await upgradeToFreePlan(plan.id);
        if (result.error) toast.error(result.error);
        else {
          toast.success(t("claimed"));
          router.refresh();
        }
      } else {
        const result = await createCheckoutSession(plan.id);
        if (result.error) toast.error(result.error);
        else if (result.url) {
          window.location.assign(result.url);
          return;
        }
      }
    } catch {
      toast.error(t("failed"));
    }
    setLoading(false);
  };

  return (
    <div>
      <div role="radiogroup" className="flex flex-col gap-2.5">
        {plans.map((plan) => {
          const current = plan.id === currentPlanId;
          const on = plan.id === selected;
          const { price, per } = formatPlanPrice(plan, (k) => t(k));
          return (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={current}
              onClick={() => setSelected(plan.id)}
              className={cn(
                "flex cursor-pointer items-center gap-4 rounded-2xl border-[1.5px] px-4 py-3.5 text-left transition-colors disabled:cursor-default disabled:opacity-60",
                on
                  ? "border-on-field bg-paper text-[#170B11] dark:text-ink"
                  : "border-[var(--on-field-rule)] hover:border-on-field",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-[22px] flex-none place-items-center rounded-full border-[1.5px] border-current",
                )}
              >
                {on && <span className="size-2.5 rounded-full bg-current" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold">{plan.name}</span>
                {current && <span className="block text-[13px] opacity-75">{t("current")}</span>}
              </span>
              <span className="text-right tnum">
                <span className="block text-[17px] font-semibold">{plan.price === 0 ? t("freePrice") : price}</span>
                <span className="block text-[13px] opacity-75">{per}</span>
              </span>
            </button>
          );
        })}
      </div>
      <Capsule
        variant="field"
        size="lg"
        className="mt-5 w-full"
        onClick={go}
        disabled={loading || !selected}
      >
        {loading ? t("processing") : t("choose")}
      </Capsule>
    </div>
  );
}

/** Free plans as they are, then the two placeholder paid plans, none choosable. */
function ComingSoonPlans({
  plans,
  currentPlanId,
}: {
  plans: Plan[];
  currentPlanId: string | undefined;
}) {
  const t = useTranslations("plans");
  const rows = [
    ...plans
      .filter((p) => p.price === 0)
      .map((p) => ({ id: p.id, name: p.name, price: p.price, interval: p.interval })),
    ...PLACEHOLDER_PLANS.map((p) => ({
      id: p.id,
      name: t(`placeholder.${p.nameKey}`),
      price: p.price,
      interval: p.interval,
    })),
  ];
  return (
    <div>
      <ul className="flex flex-col gap-2.5">
        {rows.map((plan) => {
          const paid = plan.price > 0;
          const { price, per } = formatPlanPrice(plan, (k) => t(k));
          return (
            <li
              key={plan.id}
              className="flex items-center gap-4 rounded-2xl border-[1.5px] border-[var(--on-field-rule)] px-4 py-3.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold">{plan.name}</span>
                {plan.id === currentPlanId ? (
                  <span className="block text-[13px] opacity-75">{t("current")}</span>
                ) : (
                  paid && (
                    <span className="block text-[13px] font-semibold tracking-[1px] uppercase opacity-75">
                      {t("comingSoon")}
                    </span>
                  )
                )}
              </span>
              <span className="text-right tnum">
                <span className="block text-[17px] font-semibold">{paid ? price : t("freePrice")}</span>
                <span className="block text-[13px] opacity-75">{per}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <Capsule variant="field" size="lg" className="mt-5 w-full" disabled>
        {t("comingSoon")}
      </Capsule>
    </div>
  );
}
