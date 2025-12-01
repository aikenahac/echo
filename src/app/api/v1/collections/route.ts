import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/v1/collections
 * Get user's collections
 */
export const GET = withAuth(async (request, { user }) => {
  const userCollections = await db.query.collections.findMany({
    where: eq(collections.userId, user.id),
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
    orderBy: (collections, { asc }) => [asc(collections.createdAt)],
  });

  // Transform to include book count and books
  const transformed = userCollections.map((collection) => ({
    ...collection,
    bookCount: collection.books.length,
    books: collection.books.map((cb) => cb.userBook),
  }));

  return createApiResponse(transformed);
});

/**
 * POST /api/v1/collections
 * Create a new collection
 * Body: { name, description?, isPublic?, colorTag?, iconName? }
 */
export const POST = withAuth(async (request, { user }) => {
  const body = await request.json();
  const { name, description, isPublic, colorTag, iconName } = body;

  if (!name || name.trim().length === 0) {
    throw new Error("Collection name is required");
  }

  if (name.length > 100) {
    throw new Error("Collection name must be less than 100 characters");
  }

  // Generate slug from name
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const [newCollection] = await db
    .insert(collections)
    .values({
      userId: user.id,
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      isPublic: isPublic || false,
      colorTag: colorTag || null,
      iconName: iconName || null,
    })
    .returning();

  return createApiResponse(newCollection, 201);
});
