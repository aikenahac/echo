import {
  createLemonSqueezyClient,
  type LemonSqueezyClient,
} from "@avarra/lemonsqueezy";
import { z } from "zod";

// Lazily initialized so importing this module never requires
// LEMON_SQUEEZY_API_KEY (e.g. during `next build`).
let client: LemonSqueezyClient | null = null;

export function getLemonSqueezy() {
  if (!client) {
    client = createLemonSqueezyClient({
      apiKey: process.env.LEMON_SQUEEZY_API_KEY!,
    });
  }
  return client;
}

export function lemonSqueezyStoreId() {
  return process.env.LEMON_SQUEEZY_STORE_ID!;
}

/** Whether checkouts are created in Lemon Squeezy test mode. */
export function lemonSqueezyTestMode() {
  return process.env.LEMON_SQUEEZY_TEST_MODE === "true";
}

/**
 * Whether Lemon Squeezy credentials are present. Without them checkout cannot
 * work, so pricing surfaces show placeholder "coming soon" plans instead.
 */
export function isLemonSqueezyConfigured() {
  return Boolean(
    process.env.LEMON_SQUEEZY_API_KEY && process.env.LEMON_SQUEEZY_STORE_ID,
  );
}

// The client only types subscription events; order events arrive as unknown data
const orderSchema = z.object({
  id: z.string(),
  attributes: z.object({
    customer_id: z.number(),
    status: z.string(),
    created_at: z.string(),
    first_order_item: z.object({ variant_id: z.number() }),
  }),
});

/** A one-time Lemon Squeezy order, from an `order_*` webhook. */
export function parseOrder(data: unknown) {
  const { id, attributes } = orderSchema.parse(data);
  return {
    id,
    customerId: attributes.customer_id,
    status: attributes.status,
    variantId: attributes.first_order_item.variant_id,
    createdAt: attributes.created_at,
  };
}

export type LemonSqueezyOrder = ReturnType<typeof parseOrder>;
