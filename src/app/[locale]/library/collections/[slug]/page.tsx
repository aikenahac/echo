import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getCollectionById } from "@/app/[locale]/actions/collections";
import { CollectionDetail } from "@/components/collections/collection-detail";
import { getLibraryLayout } from "@/lib/library-layout";

// Deduplicate the lookup between generateMetadata and the page
const getCollection = cache(getCollectionById);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCollection(slug);

  if (result.error || !result.collection) {
    return {
      title: "Collection Not Found",
    };
  }

  return {
    title: result.collection.name,
    description:
      result.collection.description ||
      `View ${result.collection.name} collection`,
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

  const [result, layout] = await Promise.all([
    getCollection(slug),
    getLibraryLayout(),
  ]);

  if (result.error || !result.collection) {
    notFound();
  }

  const collection = result.collection;

  // Check access: must be owner or public collection
  if (!collection.isPublic && collection.userId !== userId) {
    notFound();
  }

  const isOwner = userId === collection.userId;

  return (
    <CollectionDetail
      collection={{
        id: collection.id,
        name: collection.name,
        description: collection.description,
        isPublic: collection.isPublic,
        colorTag: collection.colorTag,
        iconName: collection.iconName,
        coverImageUrl: collection.coverImageUrl,
      }}
      books={collection.books.map((cb) => cb.userBook)}
      isOwner={isOwner}
      ownerName={
        collection.user.displayName || collection.user.username || ""
      }
      isFollowing={collection.isFollowing}
      initialLayout={layout}
    />
  );
}
