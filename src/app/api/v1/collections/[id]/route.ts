import { withAuth } from "@/lib/api-handler";
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
export const PUT = withAuth(async (request, { user, params }) => {
  const { id } = params;
  const body = await request.json();

  // Verify ownership
  const existing = await db.query.collections.findFirst({
    where: and(eq(collections.id, id), eq(collections.userId, user.id)),
  });

  if (!existing) {
    return createErrorResponse("Collection not found", 404);
  }

  const updateData: any = { updatedAt: new Date() };

  if (body.name !== undefined) {
    if (!body.name || body.name.trim().length === 0) {
      throw new Error("Collection name cannot be empty");
    }
    if (body.name.length > 100) {
      throw new Error("Collection name must be less than 100 characters");
    }
    updateData.name = body.name.trim();
    // Generate new slug when name changes
    updateData.slug = body.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  if (body.description !== undefined) {
    updateData.description = body.description?.trim() || null;
  }

  if (body.isPublic !== undefined) {
    updateData.isPublic = body.isPublic;
  }

  if (body.colorTag !== undefined) {
    updateData.colorTag = body.colorTag;
  }

  if (body.iconName !== undefined) {
    updateData.iconName = body.iconName;
  }

  if (body.coverImageUrl !== undefined) {
    updateData.coverImageUrl = body.coverImageUrl;
  }

  const [updated] = await db
    .update(collections)
    .set(updateData)
    .where(eq(collections.id, id))
    .returning();

  return createApiResponse(updated);
});

/**
 * DELETE /api/v1/collections/:id
 * Delete a collection
 */
export const DELETE = withAuth(async (request, { user, params }) => {
  const { id } = params;

  // Verify ownership
  const existing = await db.query.collections.findFirst({
    where: and(eq(collections.id, id), eq(collections.userId, user.id)),
  });

  if (!existing) {
    return createErrorResponse("Collection not found", 404);
  }

  await db.delete(collections).where(eq(collections.id, id));

  return createApiResponse({ success: true });
});
