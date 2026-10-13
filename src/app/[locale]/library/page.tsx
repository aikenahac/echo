import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { userBooks } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getUserCollections,
  hasCollectionAccess,
} from "@/app/[locale]/actions/collections";
import { getLibraryLayout } from "@/lib/library-layout";
import { Column } from "@/components/echo/primitives";
import {
  LibraryHeader,
  SHELVES,
  type Shelf,
} from "@/components/library/library-header";
import { ReadingHero } from "@/components/library/reading-hero";
import {
  AlsoReading,
  CollectionsStrip,
  EmptyReadingHero,
  FriendsNote,
} from "@/components/library/library-sections";
import { ShelfView } from "@/components/library/shelf-views";

export async function generateMetadata() {
  const t = await getTranslations("shelf");
  return { title: t("title") };
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ shelf?: string }>;
}) {
  // The proxy already protects /library, this narrows userId for the queries
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const { shelf: shelfParam } = await searchParams;
  const shelf: Shelf = SHELVES.includes(shelfParam as Shelf)
    ? (shelfParam as Shelf)
    : "reading";

  const [allUserBooks, collectionsResult, collectionAccess, layout] =
    await Promise.all([
      db.query.userBooks.findMany({
        where: eq(userBooks.userId, userId),
        with: {
          book: true,
        },
        orderBy: (userBooks, { desc }) => [desc(userBooks.updatedAt)],
      }),
      getUserCollections(),
      hasCollectionAccess(),
      getLibraryLayout(),
    ]);

  const byShelf: Record<Shelf, typeof allUserBooks> = {
    reading: allUserBooks.filter((ub) => ub.status === "reading"),
    want: allUserBooks.filter((ub) => ub.status === "want"),
    finished: allUserBooks.filter((ub) => ub.status === "finished"),
    favourites: allUserBooks.filter((ub) => ub.isFavorite),
  };
  const counts = Object.fromEntries(
    SHELVES.map((s) => [s, byShelf[s].length]),
  ) as Record<Shelf, number>;

  const year = new Date().getFullYear();
  const finishedThisYear = byShelf.finished.filter(
    (ub) => ub.finishedAt && new Date(ub.finishedAt).getFullYear() === year,
  ).length;

  const collections = (collectionsResult.collections ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    colorTag: c.colorTag,
    iconName: c.iconName,
    bookCount: c.bookCount,
  }));

  const header = (
    <LibraryHeader
      shelf={shelf}
      counts={counts}
      layout={layout}
      showToggle={shelf !== "reading"}
    />
  );

  if (shelf !== "reading") {
    return (
      <>
        {header}
        <Column className="pb-12">
          <ShelfView
            key={shelf}
            shelf={shelf}
            books={byShelf[shelf]}
            layout={layout}
            finishedThisYear={finishedThisYear}
          />
        </Column>
      </>
    );
  }

  const [current, ...others] = byShelf.reading;
  const isNewReader = allUserBooks.length === 0;

  return (
    <>
      {current ? (
        <ReadingHero key={current.id} userBook={current} header={header} />
      ) : (
        <section className="on-field bg-field">
          {header}
          <EmptyReadingHero />
        </section>
      )}
      <Column className="grid gap-10 pt-7 pb-12 md:pt-10 lg:grid-cols-2 lg:gap-16">
        {others.length > 0 && <AlsoReading books={others} />}
        {(collections.length > 0 || collectionAccess.hasAccess) && (
          <CollectionsStrip
            collections={collections}
            hasAccess={!!collectionAccess.hasAccess}
          />
        )}
        {isNewReader && <FriendsNote />}
      </Column>
    </>
  );
}
