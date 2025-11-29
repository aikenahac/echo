import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { updateProfile } from "@/app/[locale]/actions/profile";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/v1/profile
 * Get current user's profile
 */
export const GET = withAuth(async (request, { user }) => {
  const profile = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  return createApiResponse(profile);
});

/**
 * PUT /api/v1/profile
 * Update current user's profile
 * Body: { username: string, bio: string }
 */
export const PUT = withAuth(async (request, { user }) => {
  const body = await request.json();
  const { username, bio } = body;

  if (!username) {
    throw new Error("Missing required field: username");
  }

  const result = await updateProfile(username, bio || "");

  if (result.error) {
    throw new Error(result.error);
  }

  return createApiResponse(result);
});
