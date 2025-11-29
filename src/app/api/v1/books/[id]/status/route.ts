import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { updateBookStatus } from "@/app/[locale]/actions/books";

/**
 * PUT /api/v1/books/:id/status
 * Update the reading status of a book
 * Body: { status: "want" | "reading" | "finished" }
 */
export const PUT = withAuth(async (request, { user, params }) => {
  const { id } = params;
  const body = await request.json();
  const { status } = body;

  if (!status) {
    throw new Error("Missing required field: status");
  }

  if (!["want", "reading", "finished"].includes(status)) {
    throw new Error('Status must be one of: "want", "reading", "finished"');
  }

  const result = await updateBookStatus(id, status);

  if (result.error) {
    throw new Error(result.error);
  }

  return createApiResponse(result);
});
