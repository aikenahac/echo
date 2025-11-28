"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Update user profile
 */
export async function updateProfile(username: string, bio: string) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    // Check if username is already taken (if changed)
    if (username) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existingUser && existingUser.id !== userId) {
        return { error: "Username already taken" };
      }
    }

    // Update user profile
    await db
      .update(users)
      .set({
        username: username || null,
        bio: bio || null,
      })
      .where(eq(users.id, userId));

    revalidatePath("/profile");

    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { error: "Failed to update profile" };
  }
}
