import {
  createLemonSqueezyClient,
  type LemonSqueezyClient,
} from "@avarra/lemonsqueezy";

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
