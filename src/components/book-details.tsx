"use client";

import { useState } from "react";
import Image from "next/image";
import { ProgressTracker } from "@/components/progress-tracker";
import { RatingForm } from "@/components/rating-form";
import { ReviewForm } from "@/components/review-form";
import type { books, userBooks, reviews, users } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Book = InferSelectModel<typeof books>;
type UserBook = InferSelectModel<typeof userBooks> | null;
type Review = InferSelectModel<typeof reviews> | null;
type ReviewWithUser = InferSelectModel<typeof reviews> & {
  user: InferSelectModel<typeof users>;
};

interface BookDetailsProps {
  book: Book;
  userBook: UserBook;
  userReview: Review;
  friendReviews: ReviewWithUser[];
  isAuthenticated: boolean;
}

export function BookDetails({
  book,
  userBook,
  userReview,
  friendReviews,
  isAuthenticated,
}: BookDetailsProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Book Info */}
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3">
          {book.coverUrl ? (
            <div className="relative w-full aspect-[2/3]">
              <Image
                src={book.coverUrl}
                alt={book.title}
                fill
                className="rounded-lg shadow-lg object-cover"
              />
            </div>
          ) : (
            <div className="w-full aspect-[2/3] bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
              No cover available
            </div>
          )}
        </div>

        <div className="md:w-2/3 space-y-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
            <p className="text-xl text-muted-foreground">{book.author}</p>
          </div>

          <div className="space-y-2 text-sm">
            {book.publishedYear && (
              <p>
                <span className="font-semibold">Published:</span>{" "}
                {book.publishedYear}
              </p>
            )}
            {book.pages && (
              <p>
                <span className="font-semibold">Pages:</span> {book.pages}
              </p>
            )}
            {book.isbn && (
              <p>
                <span className="font-semibold">ISBN:</span> {book.isbn}
              </p>
            )}
          </div>

          {/* User's Status */}
          {userBook && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-2">Your Status:</p>
              <p className="text-sm capitalize">{userBook.status.replace("_", " ")}</p>
              {userBook.startedAt && (
                <p className="text-xs text-muted-foreground">
                  Started: {new Date(userBook.startedAt).toLocaleDateString()}
                </p>
              )}
              {userBook.finishedAt && (
                <p className="text-xs text-muted-foreground">
                  Finished: {new Date(userBook.finishedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Tracker */}
      {userBook && userBook.status === "reading" && book.pages && (
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Reading Progress</h2>
          <ProgressTracker
            userBookId={userBook.id}
            currentPage={userBook.currentPage || 0}
            totalPages={book.pages}
          />
        </div>
      )}

      {/* Rating */}
      {userBook && userBook.status === "finished" && (
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Your Rating</h2>
          <RatingForm userBookId={userBook.id} currentRating={userBook.rating} />
        </div>
      )}

      {/* Review */}
      {userBook && (
        <div className="border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Review</h2>
            {!showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                {userReview ? "Edit Review" : "Write Review"}
              </button>
            )}
          </div>

          {showReviewForm ? (
            <ReviewForm
              bookId={book.id}
              existingReview={userReview}
              onCancel={() => setShowReviewForm(false)}
              onSuccess={() => setShowReviewForm(false)}
            />
          ) : userReview ? (
            <div className="space-y-2">
              <p className="text-sm whitespace-pre-wrap">{userReview.content}</p>
              <p className="text-xs text-muted-foreground">
                {userReview.isPrivate ? "Private" : "Public"} •{" "}
                {new Date(userReview.createdAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t written a review yet.
            </p>
          )}
        </div>
      )}

      {/* Friend Reviews */}
      {friendReviews.length > 0 && (
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Reviews from People You Follow</h2>
          <div className="space-y-4">
            {friendReviews.map((review) => (
              <div key={review.id} className="border-b last:border-b-0 pb-4 last:pb-0">
                <p className="font-semibold text-sm mb-1">
                  {review.user.username || review.user.email}
                </p>
                <p className="text-sm whitespace-pre-wrap">{review.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAuthenticated && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Sign in to add this book to your library and write reviews.</p>
        </div>
      )}
    </div>
  );
}
