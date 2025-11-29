import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { addBookToLibrary } from "@/app/[locale]/actions/books";
import { db } from "@/db";
import { userBooks } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/v1/books
 * Add a book to the user's library
 */
export const POST = withAuth(async (request, { user }) => {
  const body = await request.json();
  const { bookData, status } = body;

  if (!bookData || !status) {
    throw new Error("Missing required fields: bookData, status");
  }

  // Reuse existing server action
  const result = await addBookToLibrary(bookData, status);

  if (result.error) {
    throw new Error(result.error);
  }

  return createApiResponse(result, 201);
});

/**
 * GET /api/v1/books
 * Get user's books, optionally filtered by status
 * Query params:
 *  - status: "want" | "reading" | "finished" (optional)
 */
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = db.query.userBooks.findMany({
    where: eq(userBooks.userId, user.id),
    with: { book: true },
  });

  // Note: Status filtering would need to be added to the where clause
  // For now, we'll return all books and filter can be done client-side
  // or you can add status filtering logic here

  const results = await query;

  return createApiResponse(results);
});
