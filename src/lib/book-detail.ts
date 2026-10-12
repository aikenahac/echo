import { db } from "@/db";
import { books, userBooks, reviews, follows } from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { publicUserColumns } from "@/lib/public-user";

/**
 * A catalog book with the viewer's library entry, the viewer's review, and
 * public reviews of the book by users the viewer follows.
 * Returns null if the book doesn't exist.
 */
export async function getCatalogBookDetail(
  bookId: string,
  userId: string | null,
) {
  const [book, userBook, myReview, followingReviews] = await Promise.all([
    db.query.books.findFirst({
      where: eq(books.id, bookId),
    }),
    userId
      ? db.query.userBooks.findFirst({
          where: and(eq(userBooks.userId, userId), eq(userBooks.bookId, bookId)),
        })
      : undefined,
    userId
      ? db.query.reviews.findFirst({
          where: and(eq(reviews.userId, userId), eq(reviews.bookId, bookId)),
        })
      : undefined,
    userId
      ? db.query.reviews.findMany({
          where: and(
            eq(reviews.bookId, bookId),
            eq(reviews.isPrivate, false),
            inArray(
              reviews.userId,
              db
                .select({ id: follows.followingId })
                .from(follows)
                .where(eq(follows.followerId, userId)),
            ),
          ),
          with: {
            user: { columns: publicUserColumns },
          },
          orderBy: [desc(reviews.createdAt)],
        })
      : [],
  ]);

  if (!book) {
    return null;
  }

  return {
    book,
    userBook: userBook ?? null,
    myReview: myReview ?? null,
    followingReviews,
  };
}
