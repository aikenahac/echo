"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
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
    // Get current user from Clerk to access email
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return { error: "User not found" };
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      return { error: "Email not found" };
    }

    // Check if username is already taken (if changed)
    if (username) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existingUser && existingUser.id !== userId) {
        return { error: "Username already taken" };
      }
    }

    // Upsert user profile (insert or update)
    await db
      .insert(users)
      .values({
        id: userId,
        email: email,
        username: username || null,
        bio: bio || null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username: username || null,
          bio: bio || null,
        },
      });

    revalidatePath("/profile");

    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { error: "Failed to update profile" };
  }
}
