import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getCollectionById } from "@/app/[locale]/actions/collections";
import { CollectionIsland } from "@/components/collections/collection-island";
import { Metadata } from "next";
import { db } from "@/db";
import { userBooks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCollectionById(slug);

  if (result.error || !result.collection) {
    return {
      title: "Collection Not Found",
    };
  }

  return {
    title: `${result.collection.name} | Echo Reads`,
    description: result.collection.description || `View ${result.collection.name} collection`,
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const { userId } = await auth();

  if (!userId) {
    notFound();
  }

  // Fetch collection by slug
  const result = await getCollectionById(slug);

  if (result.error || !result.collection) {
    notFound();
  }

  const collection = result.collection;

  // Check access: must be owner or public collection
  if (!collection.isPublic && collection.userId !== userId) {
    notFound();
  }

  const isOwner = userId === collection.userId;

  // Fetch all user books with book details for the library tabs
  const allUserBooks = await db.query.userBooks.findMany({
    where: eq(userBooks.userId, userId),
    with: {
      book: true,
    },
    orderBy: (userBooks, { desc }) => [desc(userBooks.createdAt)],
  });

  // Separate books by favorites and status
  const favoriteBooks = allUserBooks.filter((ub) => ub.isFavorite);
  const wantToRead = allUserBooks.filter((ub) => ub.status === "want");
  const currentlyReading = allUserBooks.filter((ub) => ub.status === "reading");
  const finished = allUserBooks.filter((ub) => ub.status === "finished");

  return (
    <CollectionIsland
      collection={collection}
      isOwner={isOwner}
      favorites={favoriteBooks}
      wantToRead={wantToRead}
      currentlyReading={currentlyReading}
      finished={finished}
    />
  );
}
