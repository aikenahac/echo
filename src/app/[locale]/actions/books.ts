"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { books, userBooks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidateLocalized } from "@/lib/revalidate";
import type { NormalizedBook } from "@/lib/books";

export type ReadingStatus = "want" | "reading" | "finished";

const isValidPageNumber = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 100_000;

/**
 * Add a book to the user's library
 */
export async function addBookToLibrary(
  bookData: NormalizedBook,
  status: ReadingStatus,
  isFavorite: boolean = false,
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }


  try {
    // Find or create the book. Concurrent inserts of the same ISBN are
    // resolved by the unique constraint.
    let existingBook = bookData.isbn
      ? await db.query.books.findFirst({
          where: eq(books.isbn, bookData.isbn),
        })
      : null;

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
        .onConflictDoNothing({ target: books.isbn })
        .returning();
      existingBook =
        newBook ??
        (await db.query.books.findFirst({
          where: eq(books.isbn, bookData.isbn!),
        }));
    }

    if (!existingBook) {
      return { error: "Failed to add book to library" };
    }

    // Add book to user's library (unique on user + book)
    const [userBook] = await db
      .insert(userBooks)
      .values({
        userId,
        bookId: existingBook.id,
        status,
        isFavorite,
        startedAt: status === "reading" ? new Date() : null,
        finishedAt: status === "finished" ? new Date() : null,
        pageCount: existingBook.pages,
        currentPage: status === "finished" ? existingBook.pages || 0 : 0,
      })
      .onConflictDoNothing({ target: [userBooks.userId, userBooks.bookId] })
      .returning();

    if (!userBook) {
      return { error: "Book already in your library" };
    }

    revalidateLocalized("/library", "/books/search");

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

    if (status === "finished") {
      if (!userBook.finishedAt) {
        updateData.finishedAt = new Date();
      }
      // Set currentPage to pageCount when marking as finished
      if (userBook.pageCount) {
        updateData.currentPage = userBook.pageCount;
      }
    }

    await db
      .update(userBooks)
      .set(updateData)
      .where(eq(userBooks.id, userBookId));

    revalidateLocalized("/library", `/books/${userBook.bookId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating book status:", error);
    return { error: "Failed to update book status" };
  }
}

/**
 * Update the page count of a book in the user's library
 */
export async function updateBookPageCount(
  userBookId: string,
  pageCount: number,
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  if (!isValidPageNumber(pageCount)) {
    return { error: "Invalid page count" };
  }

  try {
    const userBook = await db.query.userBooks.findFirst({
      where: and(eq(userBooks.id, userBookId), eq(userBooks.userId, userId)),
    });

    if (!userBook) {
      return { error: "Book not found in your library" };
    }

    const updateData: Record<string, unknown> = {
      pageCount,
      updatedAt: new Date(),
    };

    if (userBook.currentPage && (pageCount > userBook.currentPage)) {
      updateData.status = "reading"
    }

    await db
      .update(userBooks)
      .set(updateData)
      .where(eq(userBooks.id, userBookId));

    revalidateLocalized("/library", `/books/${userBook.bookId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating book page count:", error);
    return { error: "Failed to update book page count" };
  }
}

/**
 * Set the current page of a book in the user's library. The single rule set
 * behind the library card stepper, the book detail progress form and the API:
 * - the page can't exceed the page count (the user's own, else the catalog's)
 * - reaching the page count marks the book finished
 * - any other page above 0 marks it reading
 */
async function setCurrentPage(userBookId: string, currentPage: number) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  if (!isValidPageNumber(currentPage)) {
    return { error: "Invalid page number" };
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

    const totalPages = userBook.pageCount || userBook.book.pages || null;

    if (totalPages && currentPage > totalPages) {
      return { error: "Current page cannot exceed total pages" };
    }

    const now = new Date();
    const updateData: Partial<typeof userBooks.$inferInsert> = {
      currentPage,
      updatedAt: now,
    };

    if (totalPages && currentPage === totalPages) {
      if (userBook.status !== "finished") {
        updateData.status = "finished";
        updateData.finishedAt = now;
        updateData.startedAt = userBook.startedAt ?? now;
      }
    } else if (currentPage > 0 && userBook.status !== "reading") {
      updateData.status = "reading";
      updateData.startedAt = userBook.startedAt ?? now;
    }

    await db
      .update(userBooks)
      .set(updateData)
      .where(eq(userBooks.id, userBookId));

    revalidateLocalized("/library", `/books/${userBook.bookId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating book current page:", error);
    return { error: "Failed to update book current page" };
  }
}

/**
 * Update the current page of a book in the user's library (library card
 * stepper)
 */
export async function updateBookCurrentPage(
  userBookId: string,
  currentPage: number,
) {
  return setCurrentPage(userBookId, currentPage);
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
    const [userBook] = await db
      .delete(userBooks)
      .where(and(eq(userBooks.id, userBookId), eq(userBooks.userId, userId)))
      .returning({ bookId: userBooks.bookId });

    if (!userBook) {
      return { error: "Book not found in your library" };
    }

    revalidateLocalized("/library", `/books/${userBook.bookId}`);

    return { success: true };
  } catch (error) {
    console.error("Error removing book from library:", error);
    return { error: "Failed to remove book from library" };
  }
}

/**
 * Update reading progress for a book (book detail progress form). Same rules
 * as updateBookCurrentPage.
 */
export async function updateReadingProgress(
  userBookId: string,
  currentPage: number,
) {
  return setCurrentPage(userBookId, currentPage);
}

/**
 * Rate a book
 */
export async function rateBook(userBookId: string, rating: number) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Rating must be between 1 and 5" };
  }

  try {
    const [userBook] = await db
      .update(userBooks)
      .set({
        rating,
        updatedAt: new Date(),
      })
      .where(and(eq(userBooks.id, userBookId), eq(userBooks.userId, userId)))
      .returning({ bookId: userBooks.bookId });

    if (!userBook) {
      return { error: "Book not found in your library" };
    }

    revalidateLocalized("/library", `/books/${userBook.bookId}`);

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
    const [userBook] = await db
      .update(userBooks)
      .set({
        isFavorite,
        updatedAt: new Date(),
      })
      .where(and(eq(userBooks.id, userBookId), eq(userBooks.userId, userId)))
      .returning({ bookId: userBooks.bookId });

    if (!userBook) {
      return { error: "Book not found in your library" };
    }

    revalidateLocalized("/library", "/profile", `/books/${userBook.bookId}`);

    return { success: true };
  } catch (error) {
    console.error("Error toggling favorite status:", error);
    return { error: "Failed to update favorite status" };
  }
}

/**
 * Undo finishing a book: back to reading at the given page, with the finish
 * date cleared (the library's Undo after the FINISHED stamp)
 */
export async function reopenBook(userBookId: string, currentPage: number) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  if (!isValidPageNumber(currentPage)) {
    return { error: "Invalid page number" };
  }

  try {
    const [userBook] = await db
      .update(userBooks)
      .set({
        status: "reading",
        currentPage,
        finishedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(userBooks.id, userBookId), eq(userBooks.userId, userId)))
      .returning({ bookId: userBooks.bookId });

    if (!userBook) {
      return { error: "Book not found in your library" };
    }

    revalidateLocalized("/library", `/books/${userBook.bookId}`);

    return { success: true };
  } catch (error) {
    console.error("Error reopening book:", error);
    return { error: "Failed to reopen book" };
  }
}
