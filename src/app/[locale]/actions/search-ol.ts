"use server";

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
 * Search editions by title via data-source API
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
