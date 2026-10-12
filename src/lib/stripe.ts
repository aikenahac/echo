import Stripe from "stripe";

// Lazily initialized so importing this module never requires STRIPE_SECRET_KEY
// (e.g. during `next build`). Uses the SDK's pinned default API version.
let stripe: Stripe | null = null;

export function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripe;
}
