/** "€1.99 a month" / "€19.99 once, for life" from a plan row. */
export function formatPlanPrice(
  plan: { price: number; interval: string },
  t: (key: "perMonth" | "perYear" | "once") => string,
) {
  const price = `€${(plan.price / 100).toFixed(2)}`;
  const per =
    plan.interval === "month"
      ? t("perMonth")
      : plan.interval === "year"
        ? t("perYear")
        : plan.interval === "lifetime"
          ? t("once")
          : "";
  return { price, per };
}
