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
import { blurhashForKey } from "@/lib/blurhash";
import { usernameFormatError } from "@/lib/username";
import { AccountDeletionError, deleteUserAccount } from "@/lib/account";

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
      const formatError = usernameFormatError(username);
      if (formatError) {
        return { error: formatError };
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
    const pictureKey = profilePictureUrl
      ? ownedKeyFromUrl(profilePictureUrl, profilePicturePrefix(userId))
      : null;
    if (profilePictureUrl && !pictureKey) {
      return { error: "Invalid profile picture" };
    }
    const profilePictureBlurhash = pictureKey
      ? await blurhashForKey(pictureKey)
      : null;

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
        profilePictureBlurhash,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: email, // Update email from Clerk
          username: username || null,
          bio: bio || null,
          displayName: displayName || null,
          profilePictureUrl: profilePictureUrl || null,
          profilePictureBlurhash,
          updatedAt: new Date(),
        },
      });

    // Assign free plan to new users
    await ensureFreePlan(userId);

    revalidateLocalized("/profile");
    revalidateLocalized("/settings");

    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { error: "Failed to update profile" };
  }
}

export type ProfileFields = {
  username?: string | null;
  bio?: string | null;
  displayName?: string | null;
  profilePictureUrl?: string | null;
};

const PROFILE_FIELD_LIMITS = {
  bio: { max: 1000, label: "Bio" },
  displayName: { max: 100, label: "Display name" },
} as const;

/**
 * Partially update the current user's profile. Only fields present in
 * `fields` change; `null` or `""` clears a field. The username can be changed
 * but not cleared.
 */
export async function updateProfileFields(fields: ProfileFields) {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  if (!fields || typeof fields !== "object") {
    return { error: "No profile fields to update" };
  }

  const updateData: Partial<typeof users.$inferInsert> = {};

  for (const field of [
    "username",
    "bio",
    "displayName",
    "profilePictureUrl",
  ] as const) {
    const value = fields[field];
    if (value === undefined) continue;
    if (value !== null && typeof value !== "string") {
      return { error: `Invalid ${field}` };
    }
    updateData[field] = value || null;
  }

  if (Object.keys(updateData).length === 0) {
    return { error: "No profile fields to update" };
  }

  if ("username" in updateData) {
    if (!updateData.username) {
      return { error: "Username cannot be cleared" };
    }
    const formatError = usernameFormatError(updateData.username);
    if (formatError) {
      return { error: formatError };
    }
  }

  for (const field of ["bio", "displayName"] as const) {
    const value = updateData[field];
    const { max, label } = PROFILE_FIELD_LIMITS[field];
    if (value && value.length > max) {
      return { error: `${label} must be at most ${max} characters long` };
    }
  }

  // Only accept profile pictures uploaded by this user
  const pictureKey = updateData.profilePictureUrl
    ? ownedKeyFromUrl(updateData.profilePictureUrl, profilePicturePrefix(userId))
    : null;
  if (updateData.profilePictureUrl && !pictureKey) {
    return { error: "Invalid profile picture" };
  }

  try {
    if (updateData.username) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, updateData.username),
        columns: { id: true },
      });

      if (existingUser && existingUser.id !== userId) {
        return { error: "Username already taken" };
      }
    }

    // A new (or cleared) picture gets a new (or no) placeholder
    if ("profilePictureUrl" in updateData) {
      updateData.profilePictureBlurhash = pictureKey
        ? await blurhashForKey(pictureKey)
        : null;
    }

    const [updated] = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        profilePictureUrl: users.profilePictureUrl,
        profilePictureBlurhash: users.profilePictureBlurhash,
      });

    if (!updated) {
      return { error: "User not found" };
    }

    revalidateLocalized("/profile");
    revalidateLocalized("/settings");

    return { success: true as const, ...updated };
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

/**
 * Whether the current user can take a username (format rules plus uniqueness;
 * their own current username counts as available)
 */
export async function checkUsernameAvailable(
  username: string,
): Promise<{ available: boolean; reason?: string }> {
  const { userId } = await auth();

  if (!userId) {
    return { available: false, reason: "Unauthorized" };
  }

  if (typeof username !== "string") {
    return { available: false, reason: "Invalid username" };
  }

  const formatError = usernameFormatError(username);
  if (formatError) {
    return { available: false, reason: formatError };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
    columns: { id: true },
  });

  if (existing && existing.id !== userId) {
    return { available: false, reason: "Username already taken" };
  }

  return { available: true };
}

/**
 * Permanently delete the current user's account (Settings › Delete account)
 */
export async function deleteAccount() {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized" };
  }

  try {
    await deleteUserAccount(userId);
    return { success: true };
  } catch (error) {
    console.error("Error deleting account:", error);
    return {
      error:
        error instanceof AccountDeletionError
          ? error.message
          : "Failed to delete account",
    };
  }
}
