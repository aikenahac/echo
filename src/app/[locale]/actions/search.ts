"use server";

import { db } from "@/db";
import { books } from "@/db/schema";
import { or, ilike, sql, and, eq } from "drizzle-orm";
import {
  searchBooks as searchOpenLibrary,
  type OpenLibraryBook,
} from "@/lib/books";

export interface SearchResult {
  id?: string; // UUID for internal books
  key?: string; // Open Library key for external books
  isbn: string | null;
  title: string;
  author: string;
  coverUrl: string | null;
  pages: number | null;
  publishedYear: number | null;
  source: "internal" | "external";
}

/**
 * Save external book results to the database to build our catalog
 */
async function saveExternalBooksToDatabase(
  externalBooks: OpenLibraryBook[],
): Promise<void> {
  for (const book of externalBooks) {
    try {
      const isbn = book.isbn?.[0] || null;
      const title = book.title;
      const author = book.author_name?.[0] || "Unknown Author";
      const coverUrl = book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
        : null;
      const pages = book.number_of_pages_median || null;
      const publishedYear = book.first_publish_year || null;

      // Check if book already exists
      let existingBook = null;

      if (isbn) {
        // If book has ISBN, check by ISBN
        existingBook = await db.query.books.findFirst({
          where: eq(books.isbn, isbn),
        });
      } else {
        // If no ISBN, check by title and author to avoid duplicates
        existingBook = await db.query.books.findFirst({
          where: and(eq(books.title, title), eq(books.author, author)),
        });
      }

      // Only insert if book doesn't exist
      if (!existingBook) {
        await db.insert(books).values({
          isbn,
          title,
          author,
          coverUrl,
          pages,
          publishedYear,
        });
      }
    } catch (error) {
      // Log error but continue processing other books
      console.error("Error saving book to database:", error);
    }
  }
}

/**
 * Hybrid search: First search internal database, then fall back to Open Library API
 * All external results are automatically saved to the database
 */
export async function searchBooksHybrid(
  query: string,
): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  const searchTerm = query.trim();

  // Step 1: Search internal database
  const internalResults = await db
    .select()
    .from(books)
    .where(
      or(
        ilike(books.title, `%${searchTerm}%`),
        ilike(books.author, `%${searchTerm}%`),
        ilike(books.isbn, `%${searchTerm}%`),
      ),
    )
    .limit(20);

  // If we found results in the internal database, return them
  if (internalResults.length > 0) {
    return internalResults.map((book) => ({
      id: book.id,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      pages: book.pages,
      publishedYear: book.publishedYear,
      source: "internal" as const,
    }));
  }

  // Step 2: No internal results, search Open Library API
  const externalResults = await searchOpenLibrary(searchTerm);

  // Step 3: Save all external results to database for future searches
  if (externalResults.length > 0) {
    // Save in the background (don't await to keep search fast)
    saveExternalBooksToDatabase(externalResults).catch((error) => {
      console.error("Background save failed:", error);
    });
  }

  return externalResults.map((book) => ({
    key: book.key,
    isbn: book.isbn?.[0] || null,
    title: book.title,
    author: book.author_name?.[0] || "Unknown Author",
    coverUrl: book.cover_i
      ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
      : null,
    pages: book.number_of_pages_median || null,
    publishedYear: book.first_publish_year || null,
    source: "external" as const,
  }));
}
