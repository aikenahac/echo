/**
 * Stand-in paid plans shown as "coming soon" while Lemon Squeezy isn't
 * configured. They never reach the database or checkout.
 */
export const PLACEHOLDER_PLANS = [
  { id: "placeholder-month", nameKey: "month", price: 199, interval: "month" },
  { id: "placeholder-lifetime", nameKey: "lifetime", price: 1999, interval: "lifetime" },
] as const;
