/**
 * Whether the plan is a paid plan (paid, has a Lemon Squeezy variant, or lifetime)
 */
export function isPaidPlan(
  plan: { price: number; lemonSqueezyVariantId: string | null; interval: string } | null | undefined
) {
  return !!(
    plan &&
    (plan.price > 0 || plan.lemonSqueezyVariantId !== null || plan.interval === "lifetime")
  );
}
