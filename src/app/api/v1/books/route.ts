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
 *  - favorite: "true" | "false" (optional)
 */
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const favoriteFilter = searchParams.get("favorite");

  const { and } = await import("drizzle-orm");

  // Build where conditions
  const conditions = [eq(userBooks.userId, user.id)];

  if (status && ["want", "reading", "finished"].includes(status)) {
    conditions.push(eq(userBooks.status, status as any));
  }

  if (favoriteFilter === "true") {
    conditions.push(eq(userBooks.isFavorite, true));
  }

  const results = await db.query.userBooks.findMany({
    where: and(...conditions),
    with: { book: true },
    orderBy: (userBooks, { desc }) => [desc(userBooks.updatedAt)],
  });

  return createApiResponse(results);
});
