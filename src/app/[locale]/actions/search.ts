"use server";

import { db } from "@/db";
import { books } from "@/db/schema";
import { or, ilike, and, eq } from "drizzle-orm";
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
 * Hybrid search: Combines database and Open Library API results
 * All external results are automatically saved to the database
 *
 * @param query - Search term
 * @param offset - Pagination offset (default: 0)
 * @param limit - Number of results per page (default: 20)
 */
export async function searchBooksHybrid(
  query: string,
  offset: number = 0,
  limit: number = 20,
): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  const searchTerm = query.trim();
  const results: SearchResult[] = [];

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
    .limit(limit)
    .offset(offset);

  // Add internal results
  results.push(
    ...internalResults.map((book) => ({
      id: book.id,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      pages: book.pages,
      publishedYear: book.publishedYear,
      source: "internal" as const,
    })),
  );

  // Step 2: If we have fewer than the limit, supplement with API results
  if (results.length < limit) {
    const remainingSlots = limit - results.length;

    // Calculate API page (Open Library uses pages, not offsets)
    const apiPage = Math.floor(offset / 20) + 1;

    const externalResults = await searchOpenLibrary(searchTerm);

    // Filter out books already in internal results (by ISBN or title+author)
    const internalIsbns = new Set(
      results.map((r) => r.isbn).filter((isbn): isbn is string => !!isbn),
    );
    const internalTitleAuthors = new Set(
      results.map((r) => `${r.title}|${r.author}`),
    );

    const uniqueExternalResults = externalResults.filter((book) => {
      const isbn = book.isbn?.[0];
      const titleAuthor = `${book.title}|${book.author_name?.[0] || "Unknown Author"}`;

      return (
        (!isbn || !internalIsbns.has(isbn)) &&
        !internalTitleAuthors.has(titleAuthor)
      );
    });

    // Save external results to database in the background
    if (uniqueExternalResults.length > 0) {
      saveExternalBooksToDatabase(uniqueExternalResults).catch((error) => {
        console.error("Background save failed:", error);
      });
    }

    // Add external results up to remaining slots
    results.push(
      ...uniqueExternalResults.slice(0, remainingSlots).map((book) => ({
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
      })),
    );
  }

  return results;
}
