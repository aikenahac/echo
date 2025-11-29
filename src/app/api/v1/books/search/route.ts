import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { searchBooksHybrid } from "@/app/[locale]/actions/search";

/**
 * GET /api/v1/books/search?q=query
 * Search for books using hybrid search (database + Open Library API)
 * Query params:
 *  - q: search query (required)
 */
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    throw new Error("Missing required query parameter: q");
  }

  const results = await searchBooksHybrid(query);

  return createApiResponse(results);
});
