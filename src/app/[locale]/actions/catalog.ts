"use server";

import { requireRole } from "@/lib/auth";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Author {
  key: string;
  name: string;
  personalName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  photos: number[];
}

export interface Work {
  key: string;
  title: string;
  authorKeys: string[];
  subjects: string[];
  firstPublishDate: string | null;
  covers: number[];
}

export interface Edition {
  key: string;
  title: string;
  authorKeys: string[];
  isbn10: string[];
  isbn13: string[];
  publishers: string[];
  publishDate: string | null;
  numberOfPages: number | null;
  covers: number[];
}

async function fetchCatalog<T>(
  type: "authors" | "works" | "editions",
  page: number,
  pageSize: number,
  search?: string
): Promise<PaginatedResponse<T>> {
  const apiUrl = process.env.DATA_SOURCE_API_URL;
  if (!apiUrl) {
    console.error("DATA_SOURCE_API_URL is not configured");
    throw new Error("DATA_SOURCE_API_URL is not configured");
  }

  const url = new URL(`${apiUrl}/api/catalog/${type}`);
  url.searchParams.set("page", page.toString());
  url.searchParams.set("pageSize", pageSize.toString());
  if (search) {
    url.searchParams.set("search", search);
  }

  console.log(`Fetching catalog: ${url.toString()}`);

  try {
    const response = await fetch(url.toString());

    console.log(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch ${type}:`, response.status, errorText);
      throw new Error(`Failed to fetch ${type}: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    throw error;
  }
}

export async function listAuthors(
  page = 1,
  pageSize = 50,
  search?: string
): Promise<PaginatedResponse<Author>> {
  await requireRole(["admin", "moderator"]);
  return fetchCatalog<Author>("authors", page, pageSize, search);
}

export async function listWorks(
  page = 1,
  pageSize = 50,
  search?: string
): Promise<PaginatedResponse<Work>> {
  await requireRole(["admin", "moderator"]);
  return fetchCatalog<Work>("works", page, pageSize, search);
}

export async function listEditions(
  page = 1,
  pageSize = 50,
  search?: string
): Promise<PaginatedResponse<Edition>> {
  await requireRole(["admin", "moderator"]);
  return fetchCatalog<Edition>("editions", page, pageSize, search);
}
