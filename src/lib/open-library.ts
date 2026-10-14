// Open Library client. Safe to import from both browser and server code: the
// browser (and the mobile app) call Open Library directly so requests come
// from the user's IP, then report what they saw to our server (see
// src/lib/catalog-search.ts), which treats it as untrusted input.
import { z } from "zod";

export const OPEN_LIBRARY_PAGE_SIZE = 20;
export const OPEN_LIBRARY_FIELDS = [
  "key",
  "title",
  "author_name",
  "cover_i",
  "isbn",
  "number_of_pages_median",
  "first_publish_year",
].join(",");

const REQUEST_TIMEOUT_MS = 8000;
const MAX_QUERY_LENGTH = 200;
const MAX_ISBNS = 5;

const isbnPattern = /^(?:[0-9]{9}[0-9X]|[0-9]{13})$/;

/** One Open Library search result, validated and trimmed to what we keep. */
export const OpenLibraryDocSchema = z.object({
  key: z.string().regex(/^\/works\/OL\d+W$/),
  title: z.string().trim().min(1).max(500),
  author_name: z.array(z.string().trim().min(1).max(500)).max(10).optional(),
  first_publish_year: z
    .number()
    .int()
    .min(0)
    .refine((y) => y <= new Date().getFullYear() + 1)
    .optional(),
  // Open Library returns every edition's ISBN; keep a few valid ones
  isbn: z
    .array(z.string())
    .transform((all) => all.filter((i) => isbnPattern.test(i)).slice(0, MAX_ISBNS))
    .optional(),
  cover_i: z.number().int().positive().optional(),
  number_of_pages_median: z.number().int().min(1).max(20_000).optional(),
});
export type OpenLibraryDoc = z.infer<typeof OpenLibraryDocSchema>;

/** A book as shown in search results, whether from our catalog or Open Library. */
export interface SearchResult {
  id?: string; // our book id, once the book is in our catalog
  key?: string; // Open Library work key
  isbn: string | null;
  title: string;
  author: string;
  coverUrl: string | null;
  pages: number | null;
  publishedYear: number | null;
  source: "internal" | "external";
  /** Client-side only: lets a result be added before it has a catalog id. */
  doc?: OpenLibraryDoc;
}

export function coverUrl(coverId: number, size: "S" | "M" | "L" = "L") {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

export const isOpenLibraryCover = (url: string) =>
  url.startsWith("https://covers.openlibrary.org/");

export function docToResult(doc: OpenLibraryDoc): SearchResult {
  return {
    key: doc.key,
    isbn: doc.isbn?.[0] ?? null,
    title: doc.title,
    author: doc.author_name?.[0] ?? "Unknown Author",
    coverUrl: doc.cover_i ? coverUrl(doc.cover_i) : null,
    pages: doc.number_of_pages_median ?? null,
    publishedYear: doc.first_publish_year ?? null,
    source: "external",
    doc,
  };
}

/**
 * The form a query is searched and stored under, so "Dune ", "dune" and
 * "DUNE" share one snapshot.
 */
export function normalizeQuery(query: string) {
  return query
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

export class OpenLibraryError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "OpenLibraryError";
  }
}

export interface OpenLibraryPage {
  docs: OpenLibraryDoc[];
  numFound: number;
}

const ResponseSchema = z.object({
  numFound: z.number().int().min(0),
  docs: z.array(z.unknown()),
});

/**
 * One page (20 results) of Open Library search. `headers` is for the server
 * only: browsers can't set User-Agent, and don't need to.
 */
export async function searchOpenLibrary(
  query: string,
  page: number,
  opts: { signal?: AbortSignal; headers?: Record<string, string> } = {},
): Promise<OpenLibraryPage> {
  const params = new URLSearchParams({
    q: normalizeQuery(query),
    page: String(page),
    limit: String(OPEN_LIBRARY_PAGE_SIZE),
    fields: OPEN_LIBRARY_FIELDS,
  });

  // AbortSignal.any isn't available everywhere (React Native)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const forward = () => controller.abort();
  if (opts.signal?.aborted) controller.abort();
  opts.signal?.addEventListener("abort", forward);

  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?${params}`,
      { signal: controller.signal, headers: opts.headers },
    );
    if (!response.ok) {
      throw new OpenLibraryError(
        `Open Library returned ${response.status}`,
        response.status,
      );
    }
    const body = ResponseSchema.parse(await response.json());
    // Drop single malformed results rather than failing the whole page
    const docs = body.docs.flatMap((raw) => {
      const parsed = OpenLibraryDocSchema.safeParse(raw);
      return parsed.success ? [parsed.data] : [];
    });
    return { docs, numFound: body.numFound };
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener("abort", forward);
  }
}

/** Every identity a result can be recognised by, for matching a catalog book to an Open Library result */
export const identities = (r: SearchResult) => [
  ...(r.id ? [`id:${r.id}`] : []),
  ...(r.key ? [`key:${r.key}`] : []),
  ...(r.isbn ? [`isbn:${r.isbn}`] : []),
  `ta:${r.title.toLowerCase()}|${r.author.toLowerCase()}`,
];

/**
 * Identities that really are one book. Open Library lists distinct works that
 * share a title and author (or even an ISBN), so those must never be merged.
 */
const strongIdentities = (r: SearchResult) => [
  ...(r.id ? [`id:${r.id}`] : []),
  ...(r.key ? [`key:${r.key}`] : []),
];

/** Append `incoming` to `current`, in order, skipping books that are already there. */
export function mergeResults(current: SearchResult[], incoming: SearchResult[]) {
  const seen = new Set(current.flatMap(strongIdentities));
  const fresh = incoming.filter((r) => {
    const ids = strongIdentities(r);
    if (ids.length > 0 && ids.some((id) => seen.has(id))) return false;
    ids.forEach((id) => seen.add(id));
    return true;
  });
  return [...current, ...fresh];
}

/**
 * Open Library's results, exactly in Open Library's order. A catalog book that
 * is also one of those results keeps the Open Library position and just gains
 * its catalog id; catalog books Open Library didn't return follow after them.
 */
export function rankResults(external: SearchResult[], catalog: SearchResult[]) {
  const ranked = mergeResults([], external);
  const extras: SearchResult[] = [];
  for (const row of catalog) {
    const ids = identities(row);
    const match = ranked.find((r) => identities(r).some((id) => ids.includes(id)));
    if (match) {
      if (!match.id) match.id = row.id;
    } else {
      extras.push(row);
    }
  }
  return mergeResults(ranked, extras);
}
