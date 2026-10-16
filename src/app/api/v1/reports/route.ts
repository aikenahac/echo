import { withAuth, ApiError, actionError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { reportReview, reportUser } from "@/app/[locale]/actions/reports";

/**
 * POST /api/v1/reports
 * Report a user or a public review
 * Body: { targetType: "user" | "review", targetId: string,
 *         reason: "spam" | "harassment" | "hate" | "inappropriate" | "other",
 *         details?: string }
 */
export const POST = withAuth(async (request) => {
  const body = await request.json();

  if (typeof body !== "object" || body === null) {
    throw new ApiError("Invalid report");
  }

  const { targetType, ...rest } = body;

  if (targetType !== "user" && targetType !== "review") {
    throw new ApiError('Invalid targetType. Supported: "user", "review"');
  }

  const result =
    targetType === "user" ? await reportUser(rest) : await reportReview(rest);

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse(result, 201);
});
