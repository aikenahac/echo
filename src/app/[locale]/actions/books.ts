"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { books, userBooks, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { NormalizedBook } from "@/lib/books";

export type ReadingStatus = "want" | "reading" | "finished";

/**
 * Add a book to the user's library
 */
export async function addBookToLibrary(
  bookData: NormalizedBook,
  status: ReadingStatus,
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    // Ensure user exists in our database
    await db
      .insert(users)
      .values({
        id: userId,
        email: "", // Will be updated from Clerk webhook
      })
      .onConflictDoNothing();

    // Check if book already exists in our database
    let existingBook = bookData.isbn
      ? await db.query.books.findFirst({
          where: eq(books.isbn, bookData.isbn),
        })
      : null;

    // If book doesn't exist, create it
    if (!existingBook) {
      const [newBook] = await db
        .insert(books)
        .values({
          isbn: bookData.isbn,
          title: bookData.title,
          author: bookData.author,
          coverUrl: bookData.coverUrl,
          pages: bookData.pages,
          publishedYear: bookData.publishedYear,
        })
        .returning();
      existingBook = newBook;
    }

    // Check if user already has this book
    const existingUserBook = await db.query.userBooks.findFirst({
      where: and(
        eq(userBooks.userId, userId),
        eq(userBooks.bookId, existingBook.id),
      ),
    });

    if (existingUserBook) {
      return { error: "Book already in your library" };
    }

    // Add book to user's library
    const [userBook] = await db
      .insert(userBooks)
      .values({
        userId,
        bookId: existingBook.id,
        status,
        startedAt: status === "reading" ? new Date() : null,
      })
      .returning();

    revalidatePath("/library");
    revalidatePath("/books/search");

    return { success: true, userBook };
  } catch (error) {
    console.error("Error adding book to library:", error);
    return { error: "Failed to add book to library" };
  }
}

/**
 * Update the status of a book in the user's library
 */
export async function updateBookStatus(
  userBookId: string,
  status: ReadingStatus,
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    const userBook = await db.query.userBooks.findFirst({
      where: and(eq(userBooks.id, userBookId), eq(userBooks.userId, userId)),
    });

    if (!userBook) {
      return { error: "Book not found in your library" };
    }

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (status === "reading" && !userBook.startedAt) {
      updateData.startedAt = new Date();
    }

    if (status === "finished" && !userBook.finishedAt) {
      updateData.finishedAt = new Date();
    }

    await db
      .update(userBooks)
      .set(updateData)
      .where(eq(userBooks.id, userBookId));

    revalidatePath("/library");
    revalidatePath(`/books/${userBook.bookId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating book status:", error);
    return { error: "Failed to update book status" };
  }
}

/**
 * Remove a book from the user's library
 */
export async function removeBookFromLibrary(userBookId: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    const userBook = await db.query.userBooks.findFirst({
      where: and(eq(userBooks.id, userBookId), eq(userBooks.userId, userId)),
    });

    if (!userBook) {
      return { error: "Book not found in your library" };
    }

    await db.delete(userBooks).where(eq(userBooks.id, userBookId));

    revalidatePath("/library");
    revalidatePath(`/books/${userBook.bookId}`);

    return { success: true };
  } catch (error) {
    console.error("Error removing book from library:", error);
    return { error: "Failed to remove book from library" };
  }
}

/**
 * Update reading progress for a book
 */
export async function updateReadingProgress(
  userBookId: string,
  currentPage: number,
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    const userBook = await db.query.userBooks.findFirst({
      where: and(eq(userBooks.id, userBookId), eq(userBooks.userId, userId)),
      with: {
        book: true,
      },
    });

    if (!userBook) {
      return { error: "Book not found in your library" };
    }

    if (userBook.book.pages && currentPage > userBook.book.pages) {
      return { error: "Current page cannot exceed total pages" };
    }

    const updateData: Record<string, unknown> = {
      currentPage,
      updatedAt: new Date(),
    };

    // If user reached the last page, mark as finished
    if (
      userBook.book.pages &&
      currentPage >= userBook.book.pages &&
      userBook.status !== "finished"
    ) {
      updateData.status = "finished";
      updateData.finishedAt = new Date();
    }

    await db
      .update(userBooks)
      .set(updateData)
      .where(eq(userBooks.id, userBookId));

    revalidatePath("/library");
    revalidatePath(`/books/${userBook.bookId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating reading progress:", error);
    return { error: "Failed to update reading progress" };
  }
}

/**
 * Rate a book
 */
export async function rateBook(userBookId: string, rating: number) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  if (rating < 1 || rating > 5) {
    return { error: "Rating must be between 1 and 5" };
  }

  try {
    const userBook = await db.query.userBooks.findFirst({
      where: and(eq(userBooks.id, userBookId), eq(userBooks.userId, userId)),
    });

    if (!userBook) {
      return { error: "Book not found in your library" };
    }

    await db
      .update(userBooks)
      .set({
        rating,
        updatedAt: new Date(),
      })
      .where(eq(userBooks.id, userBookId));

    revalidatePath("/library");
    revalidatePath(`/books/${userBook.bookId}`);

    return { success: true };
  } catch (error) {
    console.error("Error rating book:", error);
    return { error: "Failed to rate book" };
  }
}

/**
 * Toggle favorite status for a book in the user's library
 */
export async function toggleBookFavorite(
  userBookId: string,
  isFavorite: boolean,
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    const userBook = await db.query.userBooks.findFirst({
      where: and(eq(userBooks.id, userBookId), eq(userBooks.userId, userId)),
    });

    if (!userBook) {
      return { error: "Book not found in your library" };
    }

    await db
      .update(userBooks)
      .set({
        isFavorite,
        updatedAt: new Date(),
      })
      .where(eq(userBooks.id, userBookId));

    revalidatePath("/library");
    revalidatePath("/profile");
    revalidatePath(`/books/${userBook.bookId}`);

    return { success: true };
  } catch (error) {
    console.error("Error toggling favorite status:", error);
    return { error: "Failed to update favorite status" };
  }
}
