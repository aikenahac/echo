import { and, asc, eq, ilike, inArray, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { books, olSearchSnapshots } from "@/db/schema";
import {
  OPEN_LIBRARY_PAGE_SIZE,
  OpenLibraryDocSchema,
  coverUrl,
  normalizeQuery,
  type OpenLibraryDoc,
  type SearchResult,
} from "@/lib/open-library";
import { escapeLike } from "@/lib/utils";
import { z } from "zod";

/** A stored Open Library result page is served for this long. */
const SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PAGE = 50;
const MAX_CATALOG_RESULTS = 10;
const MAX_NUM_FOUND = 100_000_000;

export type CatalogSearchResponse = {
  /** Books already in our catalog that match; first page only. */
  catalog: SearchResult[];
  openLibrary:
    | { status: "hit"; results: SearchResult[]; numFound: number }
    | { status: "miss" };
};

export const IngestInputSchema = z.object({
  query: z.string().max(500),
  page: z.number().int().min(1).max(MAX_PAGE),
  numFound: z.number().int().min(0).max(MAX_NUM_FOUND),
  docs: z.array(OpenLibraryDocSchema).max(OPEN_LIBRARY_PAGE_SIZE),
});

type BookRow = typeof books.$inferSelect;

function rowToResult(book: BookRow, source: SearchResult["source"]): SearchResult {
  return {
    id: book.id,
    key: book.olWorkKey ?? undefined,
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    pages: book.pages,
    publishedYear: book.publishedYear,
    source,
  };
}

/**
 * Answer a search from what we already have: matching catalog books, plus the
 * stored Open Library page when one is fresh. A "miss" tells the client to
 * ask Open Library itself and report back with `ingestSearch`.
 */
export async function searchCatalog(
  query: string,
  page: number,
): Promise<CatalogSearchResponse> {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return {
      catalog: [],
      openLibrary: { status: "hit", results: [], numFound: 0 },
    };
  }
  const safePage = Math.min(Math.max(1, Math.trunc(page) || 1), MAX_PAGE);

  let catalog: SearchResult[] = [];
  if (safePage === 1) {
    const pattern = `%${escapeLike(normalized)}%`;
    const rows = await db
      .select()
      .from(books)
      .where(
        or(
          ilike(books.title, pattern),
          ilike(books.author, pattern),
          ilike(books.isbn, pattern),
        ),
      )
      // Stable order so results don't shuffle between searches
      .orderBy(asc(books.title), asc(books.id))
      .limit(MAX_CATALOG_RESULTS);
    catalog = rows.map((row) => rowToResult(row, "internal"));
  }

  const [snapshot] = await db
    .select()
    .from(olSearchSnapshots)
    .where(
      and(
        eq(olSearchSnapshots.query, normalized),
        eq(olSearchSnapshots.page, safePage),
      ),
    )
    .limit(1);

  if (!snapshot || Date.now() - snapshot.fetchedAt.getTime() > SNAPSHOT_TTL_MS) {
    return { catalog, openLibrary: { status: "miss" } };
  }

  const rows = snapshot.workKeys.length
    ? await db.select().from(books).where(inArray(books.olWorkKey, snapshot.workKeys))
    : [];
  const byKey = new Map(rows.map((row) => [row.olWorkKey, row]));
  const results = snapshot.workKeys.flatMap((key) => {
    const row = byKey.get(key);
    return row ? [rowToResult(row, "external")] : [];
  });

  return {
    catalog,
    openLibrary: { status: "hit", results, numFound: snapshot.numFound },
  };
}

/**
 * Store a page of Open Library results a client fetched. The input is
 * untrusted (any signed-in user can send anything), so this only ever adds:
 * new books are inserted, and existing ones only get empty columns filled.
 * Overwriting is left to `verifyAndMirrorBook`, which asks Open Library itself.
 *
 * Returns a map of work key → our book id.
 */
export async function ingestSearch(
  input: z.infer<typeof IngestInputSchema>,
  userId: string,
): Promise<Record<string, string>> {
  const normalized = normalizeQuery(input.query);
  if (!normalized) return {};

  // A work appears once per page, but don't trust the client on that
  const docs = [...new Map(input.docs.map((d) => [d.key, d])).values()];
  if (docs.length === 0) return {};

  const idByKey = await upsertBooks(docs);

  const workKeys = docs.map((d) => d.key).filter((key) => idByKey.has(key));
  await db
    .insert(olSearchSnapshots)
    .values({
      query: normalized,
      page: input.page,
      workKeys,
      numFound: input.numFound,
      submittedBy: userId,
    })
    // A fresh snapshot is never replaced, only an expired one
    .onConflictDoUpdate({
      target: [olSearchSnapshots.query, olSearchSnapshots.page],
      set: {
        workKeys,
        numFound: input.numFound,
        submittedBy: userId,
        fetchedAt: new Date(),
      },
      setWhere: lt(
        olSearchSnapshots.fetchedAt,
        new Date(Date.now() - SNAPSHOT_TTL_MS),
      ),
    });

  return Object.fromEntries(idByKey);
}

/**
 * Find or create a catalog book for each Open Library doc. Books from before
 * we stored work keys are matched by ISBN, then title + author, and adopt the
 * key instead of being duplicated.
 */
export async function upsertBooks(
  docs: OpenLibraryDoc[],
): Promise<Map<string, string>> {
  const idByKey = new Map<string, string>();

  const existing = await db
    .select()
    .from(books)
    .where(inArray(books.olWorkKey, docs.map((d) => d.key)));
  const rowByKey = new Map(existing.map((row) => [row.olWorkKey!, row]));

  // Existing rows: fill gaps only, first write wins
  for (const row of existing) {
    idByKey.set(row.olWorkKey!, row.id);
    const doc = docs.find((d) => d.key === row.olWorkKey)!;
    const fill = {
      ...(row.pages == null && doc.number_of_pages_median
        ? { pages: doc.number_of_pages_median }
        : {}),
      ...(row.publishedYear == null && doc.first_publish_year
        ? { publishedYear: doc.first_publish_year }
        : {}),
      ...(row.olCoverId == null && doc.cover_i
        ? { olCoverId: doc.cover_i }
        : {}),
      ...(row.coverUrl == null && doc.cover_i
        ? { coverUrl: coverUrl(doc.cover_i) }
        : {}),
    };
    if (Object.keys(fill).length > 0) {
      await db.update(books).set(fill).where(eq(books.id, row.id));
    }
  }

  const fresh = docs.filter((d) => !rowByKey.has(d.key));
  if (fresh.length === 0) return idByKey;

  // Candidates for adoption: rows that have no work key yet
  const isbns = fresh.flatMap((d) => (d.isbn?.[0] ? [d.isbn[0]] : []));
  const byIsbn = isbns.length
    ? await db.select().from(books).where(inArray(books.isbn, isbns))
    : [];
  const byTitleAuthor = await db
    .select()
    .from(books)
    .where(
      and(
        isNull(books.olWorkKey),
        or(
          ...fresh.map((d) =>
            and(
              eq(books.title, d.title),
              eq(books.author, d.author_name?.[0] ?? "Unknown Author"),
            ),
          ),
        ),
      ),
    );
  const isbnTaken = new Set(byIsbn.map((row) => row.isbn));
  const claimed = new Set<string>();

  const toInsert: (typeof books.$inferInsert)[] = [];
  for (const doc of fresh) {
    const author = doc.author_name?.[0] ?? "Unknown Author";
    const isbn = doc.isbn?.[0] ?? null;
    const candidate =
      byIsbn.find((row) => row.isbn === isbn && !row.olWorkKey) ??
      byTitleAuthor.find((row) => row.title === doc.title && row.author === author);

    if (candidate && !claimed.has(candidate.id)) {
      claimed.add(candidate.id);
      const [adopted] = await db
        .update(books)
        .set({
          olWorkKey: doc.key,
          olCoverId: candidate.olCoverId ?? doc.cover_i ?? null,
          coverUrl:
            candidate.coverUrl ?? (doc.cover_i ? coverUrl(doc.cover_i) : null),
          pages: candidate.pages ?? doc.number_of_pages_median ?? null,
          publishedYear: candidate.publishedYear ?? doc.first_publish_year ?? null,
        })
        // Lost a race to another request: leave it, we re-select below
        .where(and(eq(books.id, candidate.id), isNull(books.olWorkKey)))
        .returning({ id: books.id });
      if (adopted) idByKey.set(doc.key, adopted.id);
      continue;
    }

    // The unique isbn column holds one book per ISBN: a second work sharing
    // the first one's ISBN is stored without it
    const useIsbn = isbn && !isbnTaken.has(isbn) ? isbn : null;
    if (useIsbn) isbnTaken.add(useIsbn);
    toInsert.push({
      olWorkKey: doc.key,
      isbn: useIsbn,
      title: doc.title,
      author,
      coverUrl: doc.cover_i ? coverUrl(doc.cover_i) : null,
      olCoverId: doc.cover_i ?? null,
      pages: doc.number_of_pages_median ?? null,
      publishedYear: doc.first_publish_year ?? null,
    });
  }

  if (toInsert.length > 0) {
    await db.insert(books).values(toInsert).onConflictDoNothing();
  }

  // Resolve everything still missing (inserted, or raced by another request)
  const missing = docs.map((d) => d.key).filter((key) => !idByKey.has(key));
  if (missing.length > 0) {
    const rows = await db
      .select({ id: books.id, key: books.olWorkKey })
      .from(books)
      .where(inArray(books.olWorkKey, missing));
    for (const row of rows) idByKey.set(row.key!, row.id);
  }
  return idByKey;
}
