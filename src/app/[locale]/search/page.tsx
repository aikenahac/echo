import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { and, eq, ilike, ne, notInArray, or } from "drizzle-orm";
import { db } from "@/db";
import { follows, userBooks, users } from "@/db/schema";
import { publicUserColumns, publicUserExtras } from "@/lib/public-user";
import { escapeLike } from "@/lib/utils";
import { getBlockedIds } from "@/lib/blocks";
import { SearchView, type SearchTab } from "@/components/search/search-view";
import type { Owned } from "@/components/search/book-results";

export async function generateMetadata() {
  const t = await getTranslations("find");
  return { title: t("title") };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const { q, tab: tabParam } = await searchParams;
  const query = q?.trim().slice(0, 200) || "";
  const tab: SearchTab = tabParam === "readers" ? "readers" : "books";

  const blockedIds = tab === "readers" ? await getBlockedIds(userId) : [];

  const [library, followingList, readers] = await Promise.all([
    tab === "books"
      ? db.query.userBooks.findMany({
          where: eq(userBooks.userId, userId),
          columns: { bookId: true, status: true, rating: true },
          with: { book: { columns: { isbn: true } } },
        })
      : [],
    db.query.follows.findMany({
      where: eq(follows.followerId, userId),
      columns: { followingId: true },
    }),
    tab === "readers" && query.length >= 2
      ? db.query.users.findMany({
          where: and(
            ne(users.id, userId),
            blockedIds.length ? notInArray(users.id, blockedIds) : undefined,
            or(
              ilike(users.username, `%${escapeLike(query)}%`),
              ilike(users.displayName, `%${escapeLike(query)}%`),
            ),
          ),
          columns: { ...publicUserColumns, bio: true },
          extras: publicUserExtras,
          limit: 30,
        })
      : [],
  ]);

  const owned: Owned = {};
  for (const ub of library) {
    const entry = { bookId: ub.bookId, status: ub.status, rating: ub.rating };
    owned[ub.bookId] = entry;
    if (ub.book.isbn) owned[`isbn:${ub.book.isbn}`] = entry;
  }

  return (
    <SearchView
      tab={tab}
      query={query}
      owned={owned}
      readers={readers}
      following={followingList.map((f) => f.followingId)}
    />
  );
}
