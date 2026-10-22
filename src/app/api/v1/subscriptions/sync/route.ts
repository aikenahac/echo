import { withAuth } from "@/lib/api-handler";
import { createApiResponse, createErrorResponse } from "@/lib/api-auth";
import { getSubscriptionResponse } from "@/lib/subscriptions";
import { syncStoreSubscription } from "@/lib/revenuecat";
import { rateLimit } from "@/lib/rate-limit";

export const POST = withAuth(async (_request, { user }) => {
  if (!rateLimit(`subscription-sync:${user.id}`, 5, 60_000)) {
    return createErrorResponse("Too many requests", 429);
  }

  try {
    await syncStoreSubscription(user.id);
  } catch (error) {
    console.error("Error syncing store subscription:", error);
  }

  return createApiResponse(await getSubscriptionResponse(user.id));
});
