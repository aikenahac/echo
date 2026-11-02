import { Expo } from "expo-server-sdk";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { withAuth, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { db } from "@/db";
import { pushTokens } from "@/db/schema";

const RegisterSchema = z.object({
  token: z.string().refine((token) => Expo.isExpoPushToken(token)),
  platform: z.enum(["ios", "android"]),
});

const UnregisterSchema = z.object({ token: z.string().min(1) });

/**
 * POST /api/v1/notifications/token
 * Register this device's Expo push token for the current user. A token
 * registered by someone else before moves to the current user.
 * Body: { token: string, platform: "ios" | "android" }
 */
export const POST = withAuth(async (request, { user }) => {
  const parsed = RegisterSchema.safeParse(await request.json());
  if (!parsed.success) {
    throw new ApiError("Invalid push token");
  }

  const { token, platform } = parsed.data;
  const now = new Date();
  await db
    .insert(pushTokens)
    .values({ token, userId: user.id, platform })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: { userId: user.id, platform, lastSeenAt: now },
    });

  return createApiResponse({ success: true }, 201);
});

/**
 * DELETE /api/v1/notifications/token
 * Stop sending notifications to this device (on sign-out)
 * Body: { token: string }
 */
export const DELETE = withAuth(async (request, { user }) => {
  const parsed = UnregisterSchema.safeParse(await request.json());
  if (!parsed.success) {
    throw new ApiError("Missing required field: token");
  }

  await db
    .delete(pushTokens)
    .where(
      and(eq(pushTokens.token, parsed.data.token), eq(pushTokens.userId, user.id)),
    );

  return createApiResponse({ success: true });
});
