import { withAuth, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import {
  addBookToLibrary,
  type ReadingStatus,
} from "@/app/[locale]/actions/books";
import { db } from "@/db";
import { userBooks } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

/**
 * POST /api/v1/books
 * Add a book to the user's library
 */
export const POST = withAuth(async (request, { user }) => {
  const body = await request.json();
  const { bookData, status, isFavorite } = body;

  if (!bookData || !status) {
    throw new ApiError("Missing required fields: bookData, status");
  }

  // Reuse existing server action
  const result = await addBookToLibrary(bookData, status, isFavorite);

  if (result.error) {
    throw new ApiError(result.error);
  }

  return createApiResponse(result, 201);
});

const READING_STATUSES = ["want", "reading", "finished"] as const;

/**
 * GET /api/v1/books
 * Get user's books, newest first. Without filters the books are grouped
 * into { favoriteBooks, wantToRead, currentlyReading, finished }; with any
 * filter a flat array of matching books is returned.
 * Query params:
 *  - status: "want" | "reading" | "finished" (optional)
 *  - favorite: "true" | "false" (optional)
 */
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const favorite = searchParams.get("favorite");

  if (status !== null && !READING_STATUSES.includes(status as ReadingStatus)) {
    throw new ApiError("Invalid status. Supported: want, reading, finished");
  }

  if (favorite !== null && favorite !== "true" && favorite !== "false") {
    throw new ApiError('Invalid favorite. Supported: "true", "false"');
  }

  if (status !== null || favorite !== null) {
    const filtered = await db.query.userBooks.findMany({
      where: and(
        eq(userBooks.userId, user.id),
        status !== null
          ? eq(userBooks.status, status as ReadingStatus)
          : undefined,
        favorite !== null
          ? eq(userBooks.isFavorite, favorite === "true")
          : undefined,
      ),
      with: {
        book: true,
      },
      orderBy: [desc(userBooks.createdAt)],
    });

    return createApiResponse(filtered);
  }

  const allUserBooks = await db.query.userBooks.findMany({
    where: eq(userBooks.userId, user.id),
    with: {
      book: true,
    },
    orderBy: [desc(userBooks.createdAt)],
  });

  // Separate books by favorites and status
  const favoriteBooks = allUserBooks.filter((ub) => ub.isFavorite);
  const wantToRead = allUserBooks.filter((ub) => ub.status === "want");
  const currentlyReading = allUserBooks.filter((ub) => ub.status === "reading");
  const finished = allUserBooks.filter((ub) => ub.status === "finished");

  return createApiResponse({
    favoriteBooks,
    wantToRead,
    currentlyReading,
    finished,
  });
});
