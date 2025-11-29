import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { removeBookFromLibrary } from "@/app/[locale]/actions/books";
import { db } from "@/db";
import { userBooks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/v1/books/:id
 * Get a specific book from user's library
 */
export const GET = withAuth(async (request, { user, params }) => {
  const { id } = params;

  const userBook = await db.query.userBooks.findFirst({
    where: and(eq(userBooks.id, id), eq(userBooks.userId, user.id)),
    with: { book: true },
  });

  if (!userBook) {
    throw new Error("Book not found in your library");
  }

  return createApiResponse(userBook);
});

/**
 * DELETE /api/v1/books/:id
 * Remove a book from user's library
 */
export const DELETE = withAuth(async (request, { user, params }) => {
  const { id } = params;

  // Verify ownership before deletion
  const userBook = await db.query.userBooks.findFirst({
    where: and(eq(userBooks.id, id), eq(userBooks.userId, user.id)),
  });

  if (!userBook) {
    throw new Error("Book not found in your library");
  }

  const result = await removeBookFromLibrary(id);

  if (result.error) {
    throw new Error(result.error);
  }

  return createApiResponse(result);
});
