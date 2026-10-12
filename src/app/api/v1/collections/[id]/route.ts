import { withAuth, actionError } from "@/lib/api-handler";
import {
  updateCollection,
  deleteCollection,
} from "@/app/[locale]/actions/collections";
import { createApiResponse, createErrorResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/v1/collections/:id
 * Get a specific collection with its books
 */
export const GET = withAuth(async (request, { user, params }) => {
  const { id } = params;

  const collection = await db.query.collections.findFirst({
    where: and(eq(collections.id, id), eq(collections.userId, user.id)),
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

  if (!collection) {
    return createErrorResponse("Collection not found", 404);
  }

  // Transform to include books array
  const transformed = {
    ...collection,
    bookCount: collection.books.length,
    books: collection.books.map((cb) => cb.userBook),
  };

  return createApiResponse(transformed);
});

/**
 * PUT /api/v1/collections/:id
 * Update a collection
 * Body: { name?, description?, isPublic?, colorTag?, iconName?, coverImageUrl? }
 */
export const PUT = withAuth(async (request, { params }) => {
  const { id } = params;
  const body = await request.json();

  // Same validation as the web app (whitelisted fields, owned cover images)
  const result = await updateCollection(id, {
    name: body.name,
    description: body.description,
    isPublic: body.isPublic,
    colorTag: body.colorTag,
    iconName: body.iconName,
    coverImageUrl: body.coverImageUrl,
  });

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse(result.collection);
});

/**
 * DELETE /api/v1/collections/:id
 * Delete a collection
 */
export const DELETE = withAuth(async (request, { params }) => {
  const { id } = params;

  const result = await deleteCollection(id);

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse({ success: true });
});
