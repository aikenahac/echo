"use server";

import { db } from "@/db";
import { books } from "@/db/schema";
import { or, ilike, sql } from "drizzle-orm";
import { searchBooks as searchOpenLibrary, type OpenLibraryBook } from "@/lib/books";

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
 * Hybrid search: First search internal database, then fall back to Open Library API
 */
export async function searchBooksHybrid(
  query: string
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
        ilike(books.isbn, `%${searchTerm}%`)
      )
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
