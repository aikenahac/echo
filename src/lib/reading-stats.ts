import { db } from "@/db";
import { books, userBooks } from "@/db/schema";
import { and, count, desc, eq, gte, sql, sum } from "drizzle-orm";

const SHELF_SIZE = 6;

/**
 * Books finished this calendar year and the sum of their catalog page counts
 */
export async function getYearStats(userId: string) {
  const currentYearStart = new Date(new Date().getFullYear(), 0, 1);

  const [stats] = await db
    .select({
      booksFinishedThisYear: count(),
      pagesReadThisYear: sum(books.pages).mapWith(Number),
    })
    .from(userBooks)
    .innerJoin(books, eq(userBooks.bookId, books.id))
    .where(
      and(
        eq(userBooks.userId, userId),
        eq(userBooks.status, "finished"),
        gte(userBooks.finishedAt, currentYearStart),
      ),
    );

  return {
    booksFinishedThisYear: stats?.booksFinishedThisYear ?? 0,
    pagesReadThisYear: stats?.pagesReadThisYear ?? 0,
  };
}

/**
 * The profile shelves: favorites, currently reading and recently finished
 * (up to 6 each, with the catalog book)
 */
export async function getProfileShelves(userId: string) {
  const [favorites, currentlyReading, recentlyFinished] = await Promise.all([
    db.query.userBooks.findMany({
      where: and(eq(userBooks.userId, userId), eq(userBooks.isFavorite, true)),
      with: { book: true },
      limit: SHELF_SIZE,
      orderBy: [desc(userBooks.updatedAt)],
    }),
    db.query.userBooks.findMany({
      where: and(eq(userBooks.userId, userId), eq(userBooks.status, "reading")),
      with: { book: true },
      limit: SHELF_SIZE,
    }),
    db.query.userBooks.findMany({
      where: and(
        eq(userBooks.userId, userId),
        eq(userBooks.status, "finished"),
      ),
      with: { book: true },
      orderBy: [sql`${userBooks.finishedAt} desc nulls last`],
      limit: SHELF_SIZE,
    }),
  ]);

  return { favorites, currentlyReading, recentlyFinished };
}
