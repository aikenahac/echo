// Open Library API utilities

export interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
}

export interface OpenLibrarySearchResponse {
  docs: OpenLibraryBook[];
  numFound: number;
}

export interface NormalizedBook {
  isbn: string | null;
  title: string;
  author: string;
  coverUrl: string | null;
  pages: number | null;
  publishedYear: number | null;
}

/**
 * Search for books using the Open Library API
 * @param query - The search query
 * @returns Array of books from Open Library
 */
export async function searchBooks(query: string): Promise<OpenLibraryBook[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20`,
      { next: { revalidate: 3600 } }, // Cache for 1 hour
    );

    if (!response.ok) {
      throw new Error("Failed to fetch books from Open Library");
    }

    const data: OpenLibrarySearchResponse = await response.json();
    return data.docs;
  } catch (error) {
    console.error("Error searching books:", error);
    return [];
  }
}

/**
 * Get a book by ISBN from Open Library
 * @param isbn - The ISBN of the book
 * @returns Book data from Open Library
 */
export async function getBookByISBN(
  isbn: string,
): Promise<OpenLibraryBook | null> {
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?isbn=${encodeURIComponent(isbn)}&limit=1`,
      { next: { revalidate: 86400 } }, // Cache for 24 hours
    );

    if (!response.ok) {
      throw new Error("Failed to fetch book by ISBN");
    }

    const data: OpenLibrarySearchResponse = await response.json();
    return data.docs[0] || null;
  } catch (error) {
    console.error("Error fetching book by ISBN:", error);
    return null;
  }
}

/**
 * Generate cover URL from Open Library cover ID
 * @param coverId - The cover ID from Open Library
 * @param size - The size of the cover (S, M, L)
 * @returns Cover URL or null
 */
export function getCoverUrl(
  coverId?: number,
  size: "S" | "M" | "L" = "M",
): string | null {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

/**
 * Normalize Open Library book data to our schema
 * @param book - Open Library book data
 * @returns Normalized book data
 */
export function normalizeBookData(book: OpenLibraryBook): NormalizedBook {
  return {
    isbn: book.isbn?.[0] || null,
    title: book.title,
    author: book.author_name?.[0] || "Unknown Author",
    coverUrl: getCoverUrl(book.cover_i, "L"),
    pages: book.number_of_pages_median || null,
    publishedYear: book.first_publish_year || null,
  };
}
