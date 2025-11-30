"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  collections,
  collectionBooks,
  collectionFollows,
  users,
  userBooks,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  generateCollectionCoverUploadUrl,
  deleteCollectionCover,
} from "@/lib/s3";

// Helper function to generate URL-friendly slug
function generateSlug(name: string, userId: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Add a short random string to ensure uniqueness
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${baseSlug}-${randomStr}`;
}

// Helper function to check if user is premium
async function checkPremiumStatus(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  return user?.isPremium || false;
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

  // Check premium status
  const isPremium = await checkPremiumStatus(userId);
  if (!isPremium) {
    return { error: "Premium subscription required to create collections" };
  }

  try {
    const slug = generateSlug(data.name, userId);

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
        name: data.name,
        description: data.description,
        slug,
        isPublic: data.isPublic,
        colorTag: data.colorTag,
        iconName: data.iconName,
        sortOrder: nextSortOrder,
      })
      .returning();

    revalidatePath("/[locale]/library", "page");
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

  try {
    // Verify ownership
    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
    });

    if (!collection || collection.userId !== userId) {
      return { error: "Collection not found or unauthorized" };
    }

    // Generate new slug if name changed
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.name && data.name !== collection.name) {
      updateData.slug = generateSlug(data.name, userId);
    }

    const [updated] = await db
      .update(collections)
      .set(updateData)
      .where(eq(collections.id, collectionId))
      .returning();

    revalidatePath("/[locale]/library", "page");
    revalidatePath(`/[locale]/collections/${collection.slug}`, "page");

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
    // Verify ownership
    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
    });

    if (!collection || collection.userId !== userId) {
      return { error: "Collection not found or unauthorized" };
    }

    // Delete cover image from S3 if exists
    if (collection.coverImageUrl) {
      try {
        await deleteCollectionCover(collection.coverImageUrl);
      } catch (error) {
        console.error("Error deleting cover image:", error);
        // Continue with deletion even if S3 deletion fails
      }
    }

    // Delete collection (cascade will handle collection_books and collection_follows)
    await db.delete(collections).where(eq(collections.id, collectionId));

    revalidatePath("/[locale]/library", "page");
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
    const userCollections = await db.query.collections.findMany({
      where: eq(collections.userId, userId),
      orderBy: [collections.sortOrder],
      with: {
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
    // Try to find by ID first, then by slug
    let collection = await db.query.collections.findFirst({
      where: eq(collections.id, identifier),
      with: {
        user: true,
        books: {
          with: {
            userBook: {
              with: {
                book: true,
              },
            },
          },
        },
        follows: true,
      },
    });

    if (!collection) {
      collection = await db.query.collections.findFirst({
        where: eq(collections.slug, identifier),
        with: {
          user: true,
          books: {
            with: {
              userBook: {
                with: {
                  book: true,
                },
              },
            },
          },
          follows: true,
        },
      });
    }

    if (!collection) {
      return { error: "Collection not found" };
    }

    // Check access permissions
    if (!collection.isPublic && collection.userId !== userId) {
      return { error: "Unauthorized to view this collection" };
    }

    // Check if current user is following (if authenticated)
    let isFollowing = false;
    if (userId) {
      const follow = await db.query.collectionFollows.findFirst({
        where: and(
          eq(collectionFollows.userId, userId),
          eq(collectionFollows.collectionId, collection.id)
        ),
      });
      isFollowing = !!follow;
    }

    return {
      success: true,
      collection: {
        ...collection,
        bookCount: collection.books.length,
        followerCount: collection.follows.length,
        isFollowing,
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
    // Verify collection ownership
    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
    });

    if (!collection || collection.userId !== userId) {
      return { error: "Collection not found or unauthorized" };
    }

    // Verify userBook belongs to user
    const userBook = await db.query.userBooks.findFirst({
      where: eq(userBooks.id, userBookId),
    });

    if (!userBook || userBook.userId !== userId) {
      return { error: "Book not found in your library" };
    }

    // Check if book is already in collection
    const existing = await db.query.collectionBooks.findFirst({
      where: and(
        eq(collectionBooks.collectionId, collectionId),
        eq(collectionBooks.userBookId, userBookId)
      ),
    });

    if (existing) {
      return { error: "Book already in collection" };
    }

    // Add book to collection
    await db.insert(collectionBooks).values({
      collectionId,
      userBookId,
      notes,
    });

    revalidatePath("/[locale]/library", "page");
    revalidatePath(`/[locale]/collections/${collection.slug}`, "page");

    return { success: true };
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
      where: eq(collections.id, collectionId),
    });

    if (!collection || collection.userId !== userId) {
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

    revalidatePath("/[locale]/library", "page");
    revalidatePath(`/[locale]/collections/${collection.slug}`, "page");

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
  try {
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

    if (!collection) {
      return { error: "Collection not found" };
    }

    if (!collection.isPublic) {
      return { error: "Cannot follow private collections" };
    }

    // Cannot follow own collections
    if (collection.userId === userId) {
      return { error: "Cannot follow your own collection" };
    }

    // Check if already following
    const existing = await db.query.collectionFollows.findFirst({
      where: and(
        eq(collectionFollows.userId, userId),
        eq(collectionFollows.collectionId, collectionId)
      ),
    });

    if (existing) {
      return { error: "Already following this collection" };
    }

    // Add follow
    await db.insert(collectionFollows).values({
      userId,
      collectionId,
    });

    revalidatePath(`/[locale]/collections/${collection.slug}`, "page");
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
    await db
      .delete(collectionFollows)
      .where(
        and(
          eq(collectionFollows.userId, userId),
          eq(collectionFollows.collectionId, collectionId)
        )
      );

    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
    });

    if (collection) {
      revalidatePath(`/[locale]/collections/${collection.slug}`, "page");
    }

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
      limit,
      with: {
        user: true,
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
        follows: true,
      },
    });

    // Transform to include counts
    const collectionsWithMeta = publicCollections.map((col) => ({
      ...col,
      bookCount: col.books.length,
      followerCount: col.follows.length,
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
  fileExtension: string = "jpg"
) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
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
      fileExtension
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

  try {
    // Verify ownership
    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
    });

    if (!collection || collection.userId !== userId) {
      return { error: "Collection not found or unauthorized" };
    }

    await db
      .update(collections)
      .set({ sortOrder: newSortOrder, updatedAt: new Date() })
      .where(eq(collections.id, collectionId));

    revalidatePath("/[locale]/library", "page");
    return { success: true };
  } catch (error) {
    console.error("Error updating collection order:", error);
    return { error: "Failed to update collection order" };
  }
}
