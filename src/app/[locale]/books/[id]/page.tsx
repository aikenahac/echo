import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { books, userBooks, reviews, follows } from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BookDetails } from "@/components/book-details";
import { publicUserColumns } from "@/lib/public-user";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();

  const [book, userBook, userReview, following] = await Promise.all([
    // Fetch book details
    db.query.books.findFirst({
      where: eq(books.id, id),
    }),
    // Fetch user's book status if logged in
    userId
      ? db.query.userBooks.findFirst({
          where: and(eq(userBooks.userId, userId), eq(userBooks.bookId, id)),
        })
      : undefined,
    // Fetch user's review if exists
    userId
      ? db.query.reviews.findFirst({
          where: and(eq(reviews.userId, userId), eq(reviews.bookId, id)),
        })
      : undefined,
    // Get list of followed user IDs
    userId
      ? db.query.follows.findMany({
          where: eq(follows.followerId, userId),
          columns: { followingId: true },
        })
      : [],
  ]);

  if (!book) {
    notFound();
  }

  // Fetch public reviews of this book from followed users
  const followingIds = following.map((f) => f.followingId);
  const friendReviews =
    followingIds.length > 0
      ? await db.query.reviews.findMany({
          where: and(
            eq(reviews.bookId, id),
            eq(reviews.isPrivate, false),
            inArray(reviews.userId, followingIds),
          ),
          with: {
            user: { columns: publicUserColumns },
          },
          orderBy: [desc(reviews.createdAt)],
        })
      : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <BookDetails
        book={book}
        userBook={userBook ?? null}
        userReview={userReview ?? null}
        friendReviews={friendReviews}
        isAuthenticated={!!userId}
      />
    </div>
  );
}
