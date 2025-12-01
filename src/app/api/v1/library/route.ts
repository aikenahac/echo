import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { userBooks } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/v1/library
 * Get user's library
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
