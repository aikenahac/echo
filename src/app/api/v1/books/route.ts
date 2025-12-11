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
  const { bookData, status, isFavorite } = body;

  if (!bookData || !status) {
    throw new Error("Missing required fields: bookData, status");
  }

  // Reuse existing server action
  const result = await addBookToLibrary(bookData, status, isFavorite);

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
  const allUserBooks = await db.query.userBooks.findMany({
    where: eq(userBooks.userId, user.id),
    with: {
      book: true,
    },
    orderBy: (userBooks, { desc }) => [desc(userBooks.createdAt)],
  });

  // Separate books by favorites and status
  const favoriteBooks = allUserBooks.filter((ub) => ub.isFavorite);
  const wantToRead = allUserBooks.filter((ub) => ub.status === "want");
  const currentlyReading = allUserBooks.filter((ub) => ub.status === "reading");
  const finished = allUserBooks.filter((ub) => ub.status === "finished");

  // Transform to include book count and books
  const transformed = {
    favoriteBooks,
    wantToRead,
    currentlyReading,
    finished,
  };

  return createApiResponse(transformed);
});
