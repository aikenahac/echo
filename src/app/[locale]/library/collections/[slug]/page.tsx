import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import {
  getCollectionById,
  getUserCollections,
  hasCollectionAccess,
} from "@/app/[locale]/actions/collections";
import { CollectionIsland } from "@/components/collections/collection-island";
import { Metadata } from "next";
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

  // Fetch collection by slug along with the sidebar data
  const [result, collectionsResult, collectionAccess, layout] =
    await Promise.all([
      getCollection(slug),
      getUserCollections(),
      hasCollectionAccess(),
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
    <CollectionIsland
      collection={collection}
      isOwner={isOwner}
      collections={collectionsResult.collections ?? []}
      hasCollectionAccess={collectionAccess.hasAccess}
      initialLayout={layout}
    />
  );
}
