import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { books, userBooks, reviews, follows } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BookDetails } from "@/components/book-details";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();

  // Fetch book details
  const book = await db.query.books.findFirst({
    where: eq(books.id, id),
  });

  if (!book) {
    notFound();
  }

  // Fetch user's book status if logged in
  let userBook = null;
  if (userId) {
    userBook = await db.query.userBooks.findFirst({
      where: and(eq(userBooks.userId, userId), eq(userBooks.bookId, id)),
    }) ?? null;
  }

  // Fetch user's review if exists
  let userReview = null;
  if (userId) {
    userReview = await db.query.reviews.findFirst({
      where: and(eq(reviews.userId, userId), eq(reviews.bookId, id)),
    }) ?? null;
  }

  // Fetch reviews from followed users
  let friendReviews: any[] = [];
  if (userId) {
    // Get list of followed user IDs
    const following = await db.query.follows.findMany({
      where: eq(follows.followerId, userId),
    });
    const followingIds = following.map((f) => f.followingId);

    if (followingIds.length > 0) {
      // Fetch reviews from followed users
      friendReviews = await db.query.reviews.findMany({
        where: and(
          eq(reviews.bookId, id),
          eq(reviews.isPrivate, false)
        ),
        with: {
          user: true,
        },
      });

      // Filter to only show reviews from followed users
      friendReviews = friendReviews.filter((review) =>
        followingIds.includes(review.userId)
      );
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BookDetails
        book={book}
        userBook={userBook}
        userReview={userReview}
        friendReviews={friendReviews}
        isAuthenticated={!!userId}
      />
    </div>
  );
}
