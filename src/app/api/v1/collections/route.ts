import { withAuth, actionError } from "@/lib/api-handler";
import { createCollection } from "@/app/[locale]/actions/collections";
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
    orderBy: (collections, { asc }) => [asc(collections.sortOrder)],
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
 * Create a new collection (Premium only)
 * Body: { name, description?, isPublic?, colorTag?, iconName? }
 */
export const POST = withAuth(async (request) => {
  const body = await request.json();
  const { name, description, isPublic, colorTag, iconName } = body;

  // Same validation, paywall and slug generation as the web app
  const result = await createCollection({
    name,
    description: description || undefined,
    isPublic: isPublic ?? false,
    colorTag: colorTag || undefined,
    iconName: iconName || undefined,
  });

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse(result.collection, 201);
});
