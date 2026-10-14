import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { books } from "@/db/schema";
import {
  OPEN_LIBRARY_FIELDS,
  OpenLibraryDocSchema,
  coverUrl,
} from "@/lib/open-library";
import { putPublicObject, s3Configured } from "@/lib/s3";

const MAX_COVER_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;

/** Open Library asks API users to identify themselves; this one is ours only. */
const OPEN_LIBRARY_HEADERS = {
  "User-Agent": `Echo (${process.env.OPEN_LIBRARY_CONTACT ?? "contact@example.com"})`,
};

async function fetchVerifiedDoc(workKey: string) {
  const params = new URLSearchParams({
    q: `key:${workKey}`,
    fields: OPEN_LIBRARY_FIELDS,
    limit: "1",
  });
  const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
    headers: OPEN_LIBRARY_HEADERS,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  const body: { docs?: unknown[] } = await response.json();
  const parsed = OpenLibraryDocSchema.safeParse(body.docs?.[0]);
  return parsed.success && parsed.data.key === workKey ? parsed.data : null;
}

async function mirrorCover(bookId: string, coverId: number) {
  const response = await fetch(`${coverUrl(coverId)}?default=false`, {
    headers: OPEN_LIBRARY_HEADERS,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.startsWith("image/jpeg")) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_COVER_BYTES) return null;
  return putPublicObject(`covers/${bookId}.jpg`, bytes, "image/jpeg");
}

/**
 * Re-fetch a book from Open Library on our own server, replacing whatever a
 * client reported with Open Library's actual data, and copy its cover to our
 * storage so books in libraries don't depend on Open Library's covers.
 *
 * Called when a book is added to a library, so server traffic to Open Library
 * grows with library adds, not with searches. Never throws: a failure just
 * leaves the book unverified and it is retried on the next add.
 */
export async function verifyAndMirrorBook(bookId: string) {
  try {
    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);
    if (!book?.olWorkKey || book.olVerifiedAt) return;

    const doc = await fetchVerifiedDoc(book.olWorkKey);
    if (!doc) return;

    const isbn = doc.isbn?.[0] ?? null;
    // isbn is unique: only take it if nobody else has it
    const isbnFree =
      isbn !== null &&
      !book.isbn &&
      (await db
        .select({ id: books.id })
        .from(books)
        .where(and(eq(books.isbn, isbn), ne(books.id, bookId)))
        .limit(1)
        .then((rows) => rows.length === 0));

    const mirrored =
      doc.cover_i && s3Configured()
        ? await mirrorCover(bookId, doc.cover_i).catch(() => null)
        : null;

    await db
      .update(books)
      .set({
        title: doc.title,
        author: doc.author_name?.[0] ?? book.author,
        pages: doc.number_of_pages_median ?? book.pages,
        publishedYear: doc.first_publish_year ?? book.publishedYear,
        olCoverId: doc.cover_i ?? book.olCoverId,
        ...(isbnFree ? { isbn } : {}),
        ...(mirrored
          ? { coverUrl: mirrored }
          : doc.cover_i && !book.coverUrl
            ? { coverUrl: coverUrl(doc.cover_i) }
            : {}),
        olVerifiedAt: new Date(),
      })
      .where(and(eq(books.id, bookId), isNull(books.olVerifiedAt)));
  } catch (error) {
    console.error("Book verification failed:", error);
  }
}
