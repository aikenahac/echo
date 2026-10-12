"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidateLocalized } from "@/lib/revalidate";
import { ensureFreePlan } from "@/lib/provisioning";
import {
  generateProfilePictureUploadUrl as generateS3UploadUrl,
  ownedKeyFromUrl,
  profilePicturePrefix,
} from "@/lib/s3";
import { validateImageUpload } from "@/lib/image-validation";

/**
 * Update user profile
 */
export async function updateProfile(
  username: string,
  bio: string,
  displayName?: string,
  profilePictureUrl?: string
) {
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

    // Validate username format
    if (username) {
      // Only allow letters, numbers, underscores, and dots
      const usernameRegex = /^[a-zA-Z0-9_.]+$/;
      if (!usernameRegex.test(username)) {
        return {
          error: "Username can only contain letters, numbers, underscores, and dots",
        };
      }

      // Check minimum length
      if (username.length < 3) {
        return { error: "Username must be at least 3 characters long" };
      }

      // Check maximum length
      if (username.length > 30) {
        return { error: "Username must be at most 30 characters long" };
      }

      // Check if username is already taken
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existingUser && existingUser.id !== userId) {
        return { error: "Username already taken" };
      }
    }

    // Validate display name if provided
    if (displayName && displayName.length > 100) {
      return { error: "Display name must be at most 100 characters long" };
    }

    if (bio && bio.length > 1000) {
      return { error: "Bio must be at most 1000 characters long" };
    }

    // Only accept profile pictures uploaded by this user
    if (
      profilePictureUrl &&
      !ownedKeyFromUrl(profilePictureUrl, profilePicturePrefix(userId))
    ) {
      return { error: "Invalid profile picture" };
    }

    // Upsert user profile (insert or update)
    await db
      .insert(users)
      .values({
        id: userId,
        email: email,
        username: username || null,
        bio: bio || null,
        displayName: displayName || null,
        profilePictureUrl: profilePictureUrl || null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: email, // Update email from Clerk
          username: username || null,
          bio: bio || null,
          displayName: displayName || null,
          profilePictureUrl: profilePictureUrl || null,
          updatedAt: new Date(),
        },
      });

    // Assign free plan to new users
    await ensureFreePlan(userId);

    revalidateLocalized("/profile");

    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { error: "Failed to update profile" };
  }
}

/**
 * Generate a presigned URL for uploading a profile picture
 */
export async function generateProfilePictureUploadUrl(
  contentType: string,
  fileSize: number
) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    const validationError = validateImageUpload(contentType, fileSize);
    if (validationError) {
      return { error: validationError };
    }

    const { uploadUrl, publicUrl, key } = await generateS3UploadUrl(
      userId,
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
