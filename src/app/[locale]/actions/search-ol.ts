"use server";

// Work result for general text queries
export interface Work {
  key: string; // e.g., "/works/OL893415W"
  title: string;
  authorKeys: string[]; // e.g., ["/authors/OL34184A"]
  authorNames: string[]; // Resolved author names
  subjects: string[]; // Book subjects/genres
  firstPublishDate: string | null;
  covers: number[]; // OpenLibrary cover IDs
  editionCount: number; // Number of editions for this work
}

// Edition result for ISBN or specific edition queries
export interface Edition {
  key: string; // e.g., "/books/OL7353617M"
  title: string;
  authors: string[]; // Author keys
  isbn10: string[];
  isbn13: string[];
  publishDate: string | null;
  numberOfPages: number | null;
  covers: number[]; // OpenLibrary cover IDs
  publishers: string[];
}

// Unified search response
export interface SearchResponse {
  type: "works" | "editions";
  query: string;
  results: Work[] | Edition[];
  total: number;
}

// Legacy types for backwards compatibility
export interface EditionResult {
  key: string; // OpenLibrary key like "/books/OL7353617M"
  title: string;
  authors: string[];
  isbn10: string[];
  isbn13: string[];
  publishDate: string | null;
  numberOfPages: number | null;
  covers: number[]; // Cover IDs from OpenLibrary
  publishers: string[];
}

export interface AuthorResult {
  key: string;
  name: string;
  birthDate: string | null;
  deathDate: string | null;
  photos: number[]; // Photo IDs from OpenLibrary
}

/**
 * Unified intelligent search using Alexandria API
 * Automatically routes to works or editions based on query type
 */
export async function searchBooks(
  query: string,
  limit = 20,
  offset = 0
): Promise<SearchResponse | null> {
  if (!query.trim()) {
    return {
      type: "works",
      query: "",
      results: [],
      total: 0,
    };
  }

  const apiUrl = process.env.DATA_SOURCE_API_URL;
  if (!apiUrl) {
    console.error("DATA_SOURCE_API_URL is not set");
    return null;
  }

  try {
    const url = new URL(`${apiUrl}/api/search`);
    url.searchParams.set("q", query.trim());
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());

    const response = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
      },
      // Disable caching for search results to ensure fresh data
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Search API error:", response.status, response.statusText);
      return null;
    }

    const data: SearchResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to search books:", error);
    return null;
  }
}

/**
 * Search editions by title via data-source API
 * @deprecated Use searchBooks() instead for unified intelligent search
 */
export async function searchEditionsByTitle(
  query: string,
  limit = 20,
  offset = 0
): Promise<EditionResult[]> {
  if (!query.trim()) return [];

  const apiUrl = process.env.DATA_SOURCE_API_URL;
  if (!apiUrl) {
    console.error("DATA_SOURCE_API_URL is not set");
    return [];
  }

  try {
    const url = new URL(`${apiUrl}/api/search/editions`);
    url.searchParams.set("q", query.trim());
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error("Search API error:", response.status, response.statusText);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to search editions:", error);
    return [];
  }
}

/**
 * Search authors by name via data-source API
 */
export async function searchAuthorsByName(
  query: string,
  limit = 20,
  offset = 0
): Promise<AuthorResult[]> {
  if (!query.trim()) return [];

  const apiUrl = process.env.DATA_SOURCE_API_URL;
  if (!apiUrl) {
    console.error("DATA_SOURCE_API_URL is not set");
    return [];
  }

  try {
    const url = new URL(`${apiUrl}/api/search/authors`);
    url.searchParams.set("q", query.trim());
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error("Search API error:", response.status, response.statusText);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to search authors:", error);
    return [];
  }
}
