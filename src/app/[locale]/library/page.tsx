import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { userBooks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { LibraryIsland } from "@/components/library-island";
import {
  getUserCollections,
  hasCollectionAccess,
} from "@/app/[locale]/actions/collections";
import { getLibraryLayout } from "@/lib/library-layout";

export default async function LibraryPage() {
  // The proxy already protects /library, this narrows userId for the queries
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const [allUserBooks, collectionsResult, collectionAccess, layout] =
    await Promise.all([
      // Fetch all user books with book details
      db.query.userBooks.findMany({
        where: eq(userBooks.userId, userId),
        with: {
          book: true,
        },
        orderBy: (userBooks, { desc }) => [desc(userBooks.createdAt)],
      }),
      getUserCollections(),
      hasCollectionAccess(),
      getLibraryLayout(),
    ]);

  // Separate books by favorites and status
  const favoriteBooks = allUserBooks.filter((ub) => ub.isFavorite);
  const wantToRead = allUserBooks.filter((ub) => ub.status === "want");
  const currentlyReading = allUserBooks.filter((ub) => ub.status === "reading");
  const finished = allUserBooks.filter((ub) => ub.status === "finished");

  return (
    <LibraryIsland
      favorites={favoriteBooks}
      wantToRead={wantToRead}
      currentlyReading={currentlyReading}
      finished={finished}
      collections={collectionsResult.collections ?? []}
      hasCollectionAccess={collectionAccess.hasAccess}
      initialLayout={layout}
    />
  );
}
