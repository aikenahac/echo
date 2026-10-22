import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { getSubscriptionResponse } from "@/lib/subscriptions";

export const GET = withAuth(async (_request, { user }) => {
  return createApiResponse(await getSubscriptionResponse(user.id));
});
