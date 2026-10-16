"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  collections,
  collectionBooks,
  collectionFollows,
  userBooks,
  userSubscriptions,
} from "@/db/schema";
import { eq, and, desc, sql, inArray, count } from "drizzle-orm";
import { after } from "next/server";
import { revalidateLocalized } from "@/lib/revalidate";
import {
  generateCollectionCoverUploadUrl,
  deleteImage,
  ownedKeyFromUrl,
  collectionCoverPrefix,
} from "@/lib/s3";
import { validateImageUpload } from "@/lib/image-validation";
import { publicUserColumns, publicUserExtras } from "@/lib/public-user";
import { isUuid } from "@/lib/utils";

// Helper function to generate URL-friendly slug
function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Add a short random string to ensure uniqueness (slug is also unique in the DB)
  const randomStr = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  return `${baseSlug}-${randomStr}`;
}

type CollectionInput = {
  name?: string;
  description?: string;
  isPublic?: boolean;
  colorTag?: string;
  iconName?: string;
};

/**
 * Validate collection fields coming from the client and return only the
 * whitelisted ones. Server action arguments are not type-checked at runtime.
 */
function sanitizeCollectionInput(
  data: CollectionInput
): { error: string } | { values: CollectionInput } {
  const values: CollectionInput = {};

  if (data.name !== undefined) {
    if (typeof data.name !== "string" || !data.name.trim()) {
      return { error: "Collection name is required" };
    }
    if (data.name.length > 100) {
      return { error: "Collection name is too long" };
    }
    values.name = data.name.trim();
  }
  if (data.description !== undefined) {
    if (typeof data.description !== "string" || data.description.length > 1000) {
      return { error: "Invalid description" };
    }
    values.description = data.description;
  }
  if (data.isPublic !== undefined) {
    if (typeof data.isPublic !== "boolean") {
      return { error: "Invalid visibility" };
    }
    values.isPublic = data.isPublic;
  }
  for (const field of ["colorTag", "iconName"] as const) {
    const value = data[field];
    if (value !== undefined) {
      if (typeof value !== "string" || value.length > 50) {
        return { error: `Invalid ${field}` };
      }
      values[field] = value;
    }
  }

  return { values };
}

// Helper function to check if user has collection access (paid plan)
async function checkCollectionAccess(userId: string): Promise<boolean> {
  const subscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId),
    with: { plan: true },
  });

  if (!subscription?.plan) {
    return false;
  }

  // Check if subscription is active
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return false;
  }

  // Check if user has a paid plan (price > 0, has lemonSqueezyVariantId, or is lifetime)
  return (
    subscription.plan.price > 0 ||
    subscription.plan.lemonSqueezyVariantId !== null ||
    subscription.plan.interval === "lifetime"
  );
}

/**
 * Check if current user has collection access
 */
export async function hasCollectionAccess() {
  const { userId } = await auth();
  if (!userId) {
    return { hasAccess: false };
  }

  const hasAccess = await checkCollectionAccess(userId);
  return { hasAccess };
}

/**
 * Create a new collection (Premium only)
 */
export async function createCollection(data: {
  name: string;
  description?: string;
  isPublic: boolean;
  colorTag?: string;
  iconName?: string;
}) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  const input = sanitizeCollectionInput({ ...data, name: data?.name ?? "" });
  if ("error" in input) {
    return { error: input.error };
  }

  // Check collection access (requires paid plan)
  const hasAccess = await checkCollectionAccess(userId);
  if (!hasAccess) {
    return { error: "Premium subscription required to create collections" };
  }

  try {
    const { values } = input;
    const slug = generateSlug(values.name!);

    // Get current max sort order for this user
    const maxSortResult = await db
      .select({ maxSort: sql<number>`COALESCE(MAX(${collections.sortOrder}), 0)` })
      .from(collections)
      .where(eq(collections.userId, userId));

    const nextSortOrder = (maxSortResult[0]?.maxSort || 0) + 1;

    const [collection] = await db
      .insert(collections)
      .values({
        userId,
        name: values.name!,
        description: values.description,
        slug,
        isPublic: values.isPublic ?? false,
        colorTag: values.colorTag,
        iconName: values.iconName,
        sortOrder: nextSortOrder,
      })
      .returning();

    revalidateLocalized("/library");
    return { success: true, collection };
  } catch (error) {
    console.error("Error creating collection:", error);
    return { error: "Failed to create collection" };
  }
}

/**
 * Update an existing collection
 */
export async function updateCollection(
  collectionId: string,
  data: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    colorTag?: string;
    iconName?: string;
    coverImageUrl?: string;
  }
) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  const input = sanitizeCollectionInput(data ?? {});
  if ("error" in input) {
    return { error: input.error };
  }

  // Only accept cover images uploaded by this user (the URL is later used to
  // derive the S3 key that gets deleted)
  const coverImageUrl = data?.coverImageUrl;
  if (
    coverImageUrl !== undefined &&
    !ownedKeyFromUrl(coverImageUrl, collectionCoverPrefix(userId))
  ) {
    return { error: "Invalid cover image" };
  }

  try {
    // Verify ownership
    const collection = await db.query.collections.findFirst({
      where: and(eq(collections.id, collectionId), eq(collections.userId, userId)),
    });

    if (!collection) {
      return { error: "Collection not found or unauthorized" };
    }

    const updateData: Partial<typeof collections.$inferInsert> = {
      ...input.values,
      updatedAt: new Date(),
    };
    if (coverImageUrl !== undefined) {
      updateData.coverImageUrl = coverImageUrl;
    }
    // Generate new slug if name changed
    if (input.values.name && input.values.name !== collection.name) {
      updateData.slug = generateSlug(input.values.name);
    }

    const [updated] = await db
      .update(collections)
      .set(updateData)
      .where(eq(collections.id, collectionId))
      .returning();

    // Clean up the replaced cover image after responding
    const oldCoverKey = ownedKeyFromUrl(
      collection.coverImageUrl,
      collectionCoverPrefix(userId)
    );
    if (oldCoverKey && coverImageUrl !== undefined && coverImageUrl !== collection.coverImageUrl) {
      after(() => deleteImage(oldCoverKey).catch((error) => {
        console.error("Error deleting old cover image:", error);
      }));
    }

    revalidateLocalized(
      "/library",
      `/library/collections/${collection.slug}`,
      `/library/collections/${updated.slug}`
    );

    return { success: true, collection: updated };
  } catch (error) {
    console.error("Error updating collection:", error);
    return { error: "Failed to update collection" };
  }
}

/**
 * Delete a collection
 */
export async function deleteCollection(collectionId: string) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    // Delete collection (cascade will handle collection_books and collection_follows)
    const [collection] = await db
      .delete(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
      .returning();

    if (!collection) {
      return { error: "Collection not found or unauthorized" };
    }

    // Delete the cover image from S3 after responding. Only keys under this
    // user's prefix are ever deleted.
    const coverKey = ownedKeyFromUrl(
      collection.coverImageUrl,
      collectionCoverPrefix(userId)
    );
    if (coverKey) {
      after(() => deleteImage(coverKey).catch((error) => {
        console.error("Error deleting cover image:", error);
      }));
    }

    revalidateLocalized("/library", `/library/collections/${collection.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting collection:", error);
    return { error: "Failed to delete collection" };
  }
}

/**
 * Get all collections for the current user
 */
export async function getUserCollections() {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    // Only the book ids are needed (for counts and membership checks)
    const userCollections = await db.query.collections.findMany({
      where: eq(collections.userId, userId),
      orderBy: [collections.sortOrder],
      with: {
        books: {
          columns: { userBookId: true },
        },
      },
    });

    // Transform to include book count
    const collectionsWithCount = userCollections.map((col) => ({
      ...col,
      bookCount: col.books.length,
    }));

    return { success: true, collections: collectionsWithCount };
  } catch (error) {
    console.error("Error fetching user collections:", error);
    return { error: "Failed to fetch collections" };
  }
}

/**
 * Get a specific collection by ID or slug
 */
export async function getCollectionById(identifier: string) {
  const { userId } = await auth();

  try {
    // Look up by ID if the identifier is a UUID, otherwise by slug
    const collection = await db.query.collections.findFirst({
      where: isUuid(identifier)
        ? eq(collections.id, identifier)
        : eq(collections.slug, identifier),
      with: {
        user: { columns: publicUserColumns, extras: publicUserExtras },
        books: {
          with: {
            userBook: {
              with: {
                book: true,
              },
            },
          },
        },
      },
    });

    if (!collection) {
      return { error: "Collection not found" };
    }

    // Check access permissions
    if (!collection.isPublic && collection.userId !== userId) {
      return { error: "Unauthorized to view this collection" };
    }

    const [[followers], follow] = await Promise.all([
      db
        .select({ count: count() })
        .from(collectionFollows)
        .where(eq(collectionFollows.collectionId, collection.id)),
      // Check if current user is following (if authenticated)
      userId
        ? db.query.collectionFollows.findFirst({
            where: and(
              eq(collectionFollows.userId, userId),
              eq(collectionFollows.collectionId, collection.id)
            ),
          })
        : undefined,
    ]);

    return {
      success: true,
      collection: {
        ...collection,
        bookCount: collection.books.length,
        followerCount: followers?.count ?? 0,
        isFollowing: !!follow,
      },
    };
  } catch (error) {
    console.error("Error fetching collection:", error);
    return { error: "Failed to fetch collection" };
  }
}

/**
 * Add a book to a collection
 */
export async function addBookToCollection(
  collectionId: string,
  userBookId: string,
  notes?: string
) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    // Verify collection and book ownership
    const [collection, userBook] = await Promise.all([
      db.query.collections.findFirst({
        where: and(eq(collections.id, collectionId), eq(collections.userId, userId)),
      }),
      db.query.userBooks.findFirst({
        where: and(eq(userBooks.id, userBookId), eq(userBooks.userId, userId)),
      }),
    ]);

    if (!collection) {
      return { error: "Collection not found or unauthorized" };
    }

    if (!userBook) {
      return { error: "Book not found in your library" };
    }

    // Add book to collection (unique on collection + book)
    const [added] = await db
      .insert(collectionBooks)
      .values({
        collectionId,
        userBookId,
        notes,
      })
      .onConflictDoNothing({
        target: [collectionBooks.collectionId, collectionBooks.userBookId],
      })
      .returning();

    if (!added) {
      return { error: "Book already in collection" };
    }

    revalidateLocalized("/library", `/library/collections/${collection.slug}`);

    return { success: true, collectionBook: added };
  } catch (error) {
    console.error("Error adding book to collection:", error);
    return { error: "Failed to add book to collection" };
  }
}

/**
 * Remove a book from a collection
 */
export async function removeBookFromCollection(
  collectionId: string,
  userBookId: string
) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    // Verify collection ownership
    const collection = await db.query.collections.findFirst({
      where: and(eq(collections.id, collectionId), eq(collections.userId, userId)),
    });

    if (!collection) {
      return { error: "Collection not found or unauthorized" };
    }

    // Remove book from collection
    await db
      .delete(collectionBooks)
      .where(
        and(
          eq(collectionBooks.collectionId, collectionId),
          eq(collectionBooks.userBookId, userBookId)
        )
      );

    revalidateLocalized("/library", `/library/collections/${collection.slug}`);

    return { success: true };
  } catch (error) {
    console.error("Error removing book from collection:", error);
    return { error: "Failed to remove book from collection" };
  }
}

/**
 * Get all books in a collection
 */
export async function getCollectionBooks(collectionId: string) {
  const { userId } = await auth();

  try {
    // Only the owner can see a private collection's books
    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
      columns: { userId: true, isPublic: true },
    });

    if (!collection || (!collection.isPublic && collection.userId !== userId)) {
      return { error: "Collection not found" };
    }

    const books = await db.query.collectionBooks.findMany({
      where: eq(collectionBooks.collectionId, collectionId),
      with: {
        userBook: {
          with: {
            book: true,
          },
        },
      },
      orderBy: [desc(collectionBooks.addedAt)],
    });

    return { success: true, books };
  } catch (error) {
    console.error("Error fetching collection books:", error);
    return { error: "Failed to fetch collection books" };
  }
}

/**
 * Follow a public collection
 */
export async function followCollection(collectionId: string) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    // Verify collection exists and is public
    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
    });

    // Cannot follow own collections
    if (collection?.userId === userId) {
      return { error: "Cannot follow your own collection" };
    }

    // Private collections of other users are reported as missing so their
    // existence isn't revealed
    if (!collection || !collection.isPublic) {
      return { error: "Collection not found" };
    }

    // Add follow
    const [created] = await db
      .insert(collectionFollows)
      .values({
        userId,
        collectionId,
      })
      .onConflictDoNothing()
      .returning();

    if (!created) {
      return { error: "Already following this collection" };
    }

    revalidateLocalized(`/library/collections/${collection.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Error following collection:", error);
    return { error: "Failed to follow collection" };
  }
}

/**
 * Unfollow a collection
 */
export async function unfollowCollection(collectionId: string) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
      columns: { slug: true },
    });

    if (!collection) {
      return { error: "Collection not found" };
    }

    await db
      .delete(collectionFollows)
      .where(
        and(
          eq(collectionFollows.userId, userId),
          eq(collectionFollows.collectionId, collectionId)
        )
      );

    revalidateLocalized(`/library/collections/${collection.slug}`);

    return { success: true };
  } catch (error) {
    console.error("Error unfollowing collection:", error);
    return { error: "Failed to unfollow collection" };
  }
}

/**
 * Get public collections (for discovery)
 */
export async function getPublicCollections(limit: number = 20) {
  try {
    const publicCollections = await db.query.collections.findMany({
      where: eq(collections.isPublic, true),
      orderBy: [desc(collections.createdAt)],
      limit: Math.min(Math.max(Math.trunc(limit) || 20, 1), 50),
      with: {
        user: { columns: publicUserColumns, extras: publicUserExtras },
        books: {
          limit: 4, // Show first 4 books as preview
          with: {
            userBook: {
              with: {
                book: true,
              },
            },
          },
        },
      },
    });

    const ids = publicCollections.map((col) => col.id);
    const [bookCounts, followerCounts] = ids.length
      ? await Promise.all([
          db
            .select({ id: collectionBooks.collectionId, count: count() })
            .from(collectionBooks)
            .where(inArray(collectionBooks.collectionId, ids))
            .groupBy(collectionBooks.collectionId),
          db
            .select({ id: collectionFollows.collectionId, count: count() })
            .from(collectionFollows)
            .where(inArray(collectionFollows.collectionId, ids))
            .groupBy(collectionFollows.collectionId),
        ])
      : [[], []];

    const bookCountById = new Map(bookCounts.map((row) => [row.id, row.count]));
    const followerCountById = new Map(followerCounts.map((row) => [row.id, row.count]));

    // Transform to include counts
    const collectionsWithMeta = publicCollections.map((col) => ({
      ...col,
      bookCount: bookCountById.get(col.id) ?? 0,
      followerCount: followerCountById.get(col.id) ?? 0,
    }));

    return { success: true, collections: collectionsWithMeta };
  } catch (error) {
    console.error("Error fetching public collections:", error);
    return { error: "Failed to fetch public collections" };
  }
}

/**
 * Generate a presigned URL for uploading a collection cover image
 */
export async function generateCollectionCoverUrl(
  collectionId: string,
  contentType: string,
  fileSize: number
) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  const validationError = validateImageUpload(contentType, fileSize);
  if (validationError) {
    return { error: validationError };
  }

  try {
    // Verify collection ownership
    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
    });

    if (!collection || collection.userId !== userId) {
      return { error: "Collection not found or unauthorized" };
    }

    // Generate presigned URL
    const { uploadUrl, publicUrl, key } = await generateCollectionCoverUploadUrl(
      userId,
      collectionId,
      contentType,
      fileSize
    );

    return {
      success: true,
      uploadUrl,
      publicUrl,
      key,
    };
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return { error: "Failed to generate upload URL" };
  }
}

/**
 * Update collection sort order
 */
export async function updateCollectionOrder(
  collectionId: string,
  newSortOrder: number
) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  if (!Number.isInteger(newSortOrder)) {
    return { error: "Invalid sort order" };
  }

  try {
    const [updated] = await db
      .update(collections)
      .set({ sortOrder: newSortOrder, updatedAt: new Date() })
      .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
      .returning({ id: collections.id });

    if (!updated) {
      return { error: "Collection not found or unauthorized" };
    }

    revalidateLocalized("/library");
    return { success: true };
  } catch (error) {
    console.error("Error updating collection order:", error);
    return { error: "Failed to update collection order" };
  }
}

const MAX_COLLECTIONS_TO_ORDER = 500;

/**
 * Reorder all of the current user's collections. `order` lists every one of
 * the user's collection IDs exactly once, in the new order.
 */
export async function reorderCollections(order: string[]) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  if (
    !Array.isArray(order) ||
    order.length > MAX_COLLECTIONS_TO_ORDER ||
    !order.every(isUuid)
  ) {
    return { error: "order must be an array of collection IDs" };
  }

  if (new Set(order).size !== order.length) {
    return { error: "order must not contain duplicate IDs" };
  }

  try {
    const owned = await db.query.collections.findMany({
      where: eq(collections.userId, userId),
      columns: { id: true },
    });
    const ownedIds = new Set(owned.map((col) => col.id));

    if (order.some((id) => !ownedIds.has(id))) {
      return { error: "Collection not found or unauthorized" };
    }

    if (order.length !== ownedIds.size) {
      return { error: "order must list each of your collections exactly once" };
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      for (const [index, id] of order.entries()) {
        await tx
          .update(collections)
          .set({ sortOrder: index + 1, updatedAt: now })
          .where(and(eq(collections.id, id), eq(collections.userId, userId)));
      }
    });

    revalidateLocalized("/library");
    return { success: true };
  } catch (error) {
    console.error("Error reordering collections:", error);
    return { error: "Failed to reorder collections" };
  }
}
