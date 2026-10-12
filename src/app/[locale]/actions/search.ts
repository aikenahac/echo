"use server";

import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { db } from "@/db";
import { books } from "@/db/schema";
import { or, ilike, and, eq, asc } from "drizzle-orm";
import {
  searchBooks as searchOpenLibrary,
  type OpenLibraryBook,
} from "@/lib/books";
import { escapeLike } from "@/lib/utils";

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

const MAX_LIMIT = 40;
const OPEN_LIBRARY_PAGE_SIZE = 20;

/**
 * Save external book results to the database to build our catalog
 */
async function saveExternalBooksToDatabase(
  externalBooks: OpenLibraryBook[],
): Promise<void> {
  const rows = externalBooks.map((book) => ({
    isbn: book.isbn?.[0] || null,
    title: book.title,
    author: book.author_name?.[0] || "Unknown Author",
    coverUrl: book.cover_i
      ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
      : null,
    pages: book.number_of_pages_median || null,
    publishedYear: book.first_publish_year || null,
  }));

  // Books with an ISBN are deduplicated by the unique constraint
  const withIsbn = rows.filter((row) => row.isbn);
  if (withIsbn.length > 0) {
    await db
      .insert(books)
      .values(withIsbn)
      .onConflictDoNothing({ target: books.isbn });
  }

  // Books without an ISBN are deduplicated by title + author
  const withoutIsbn = rows.filter((row) => !row.isbn);
  if (withoutIsbn.length > 0) {
    const existing = await db
      .select({ title: books.title, author: books.author })
      .from(books)
      .where(
        or(
          ...withoutIsbn.map((row) =>
            and(eq(books.title, row.title), eq(books.author, row.author)),
          ),
        ),
      );
    const existingKeys = new Set(existing.map((b) => `${b.title}|${b.author}`));
    const newRows = withoutIsbn.filter(
      (row) => !existingKeys.has(`${row.title}|${row.author}`),
    );
    if (newRows.length > 0) {
      await db.insert(books).values(newRows);
    }
  }
}

/**
 * Hybrid search: Combines database and Open Library API results
 * All external results are automatically saved to the database
 *
 * @param query - Search term
 * @param offset - Pagination offset (default: 0)
 * @param limit - Number of results per page (default: 20, max: 40)
 */
export async function searchBooksHybrid(
  query: string,
  offset: number = 0,
  limit: number = 20,
): Promise<SearchResult[]> {
  // Search writes to the catalog, so only signed-in users may use it
  const { userId } = await auth();
  if (!userId) {
    return [];
  }

  if (typeof query !== "string" || !query.trim()) {
    return [];
  }

  const searchTerm = query.trim().slice(0, 200);
  const safeOffset = Math.max(0, Math.trunc(Number(offset)) || 0);
  const safeLimit = Math.min(Math.max(1, Math.trunc(Number(limit)) || 20), MAX_LIMIT);
  const pattern = `%${escapeLike(searchTerm)}%`;
  const results: SearchResult[] = [];

  // Step 1: Search internal database
  const internalResults = await db
    .select()
    .from(books)
    .where(
      or(
        ilike(books.title, pattern),
        ilike(books.author, pattern),
        ilike(books.isbn, pattern),
      ),
    )
    // Stable order so offset pagination doesn't repeat or skip rows
    .orderBy(asc(books.title), asc(books.id))
    .limit(safeLimit)
    .offset(safeOffset);

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
  if (results.length < safeLimit) {
    const remainingSlots = safeLimit - results.length;

    // Calculate API page (Open Library uses pages, not offsets)
    const apiPage = Math.floor(safeOffset / OPEN_LIBRARY_PAGE_SIZE) + 1;

    const externalResults = await searchOpenLibrary(searchTerm, apiPage);

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

    // Save external results to the database after the response is sent
    if (uniqueExternalResults.length > 0) {
      after(() =>
        saveExternalBooksToDatabase(uniqueExternalResults).catch((error) => {
          console.error("Background save failed:", error);
        }),
      );
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
