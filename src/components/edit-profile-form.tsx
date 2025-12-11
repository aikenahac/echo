"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { updateProfile, generateProfilePictureUploadUrl } from "@/app/[locale]/actions/profile";
import { isValidImageType, isValidImageSize } from "@/lib/s3";
import { useRouter } from "@/i18n/routing";
import type { users } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type User = InferSelectModel<typeof users>;

interface EditProfileFormProps {
  user: User;
}

export function EditProfileForm({ user }: EditProfileFormProps) {
  const t = useTranslations("profile");
  const tToast = useTranslations("toast");
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user.username || "");
  const [bio, setBio] = useState(user.bio || "");
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow letters, numbers, underscores, and dots
    const filtered = value.replace(/[^a-zA-Z0-9_.]/g, "");
    setUsername(filtered);
  };

  const handleProfilePictureUpload = async (file: File) => {
    setUploadingPicture(true);
    try {
      // Validate file type
      if (!isValidImageType(file.type)) {
        toast.error("Invalid file type. Supported: JPG, PNG, WEBP");
        return;
      }

      // Validate file size (5MB max)
      if (!isValidImageSize(file.size, 5)) {
        toast.error("File too large. Maximum size: 5MB");
        return;
      }

      // Get presigned URL
      const ext = file.name.split(".").pop() || "jpg";
      const result = await generateProfilePictureUploadUrl(ext);

      if (result.error || !result.uploadUrl) {
        toast.error(result.error || "Failed to generate upload URL");
        return;
      }

      // Upload to S3
      const uploadResponse = await fetch(result.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      // Update profile with new URL
      const updateResult = await updateProfile(
        username,
        bio,
        displayName,
        result.publicUrl
      );

      if (updateResult.error) {
        toast.error(updateResult.error);
      } else {
        toast.success("Profile picture updated!");
        router.refresh();
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast.error("Failed to upload profile picture");
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (username && username.length < 3) {
      toast.error("Username must be at least 3 characters long");
      return;
    }

    if (username && username.length > 30) {
      toast.error("Username must be at most 30 characters long");
      return;
    }

    if (displayName && displayName.length > 100) {
      toast.error("Display name must be at most 100 characters long");
      return;
    }

    startTransition(async () => {
      const result = await updateProfile(
        username,
        bio,
        displayName,
        user.profilePictureUrl || undefined
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tToast("profileUpdated"));
        setIsEditing(false);
      }
    });
  };

  if (!isEditing) {
    return (
      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{t("information.title")}</h2>
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm px-4 py-2 border rounded-md hover:bg-accent"
          >
            {t("information.editButton")}
          </button>
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">
              Display Name
            </p>
            <p>{user.displayName || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">
              {t("information.username")}
            </p>
            <p>{user.username || t("information.noUsername")}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">
              {t("information.bio")}
            </p>
            <p className="whitespace-pre-wrap">
              {user.bio || t("information.noBio")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">{t("form.title")}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="profilePicture" className="block text-sm font-medium mb-1">
            Profile Picture
          </label>
          {user.profilePictureUrl && (
            <img
              src={user.profilePictureUrl}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover mb-2"
            />
          )}
          <input
            id="profilePicture"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleProfilePictureUpload(file);
            }}
            disabled={uploadingPicture || isPending}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Max 5MB. Supported: JPG, PNG, WEBP
          </p>
        </div>
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium mb-1">
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Choose your display name"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={100}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Your public display name. Max 100 characters.
          </p>
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            {t("form.username")}
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder={t("form.usernamePlaceholder")}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={30}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Only letters, numbers, underscores (_), and dots (.) allowed. 3-30 characters.
          </p>
        </div>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-1">
            {t("form.bio")}
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("form.bioPlaceholder")}
            rows={4}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? t("form.saving") : t("form.saveChanges")}
          </button>
          <button
            type="button"
            onClick={() => {
              setUsername(user.username || "");
              setBio(user.bio || "");
              setDisplayName(user.displayName || "");
              setIsEditing(false);
            }}
            disabled={isPending}
            className="px-6 py-2 border rounded-md hover:bg-accent disabled:opacity-50"
          >
            {t("form.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
