"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import {
  checkUsernameAvailable,
  generateProfilePictureUploadUrl,
  updateProfileFields,
} from "@/app/[locale]/actions/profile";
import { FieldInput } from "@/components/echo/field-input";
import { Icon } from "@/components/echo/icons";
import { AvatarTile } from "@/components/echo/primitives";
import { Sheet, SheetContent } from "@/components/echo/sheet";
import { isValidImageSize, isValidImageType } from "@/lib/image-validation";

export type EditableProfile = {
  username: string | null;
  displayName: string | null;
  bio: string | null;
  profilePictureUrl: string | null;
};

const BIO_MAX = 1000;

/** Edit profile: photo, display name, username (live check) and bio. */
export function EditProfileSheet({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: EditableProfile;
}) {
  const t = useTranslations("you.editor");
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [photo, setPhoto] = useState(profile.profilePictureUrl);
  const [uploading, setUploading] = useState(false);
  const [usernameState, setUsernameState] = useState<
    { ok: true } | { ok: false; message: string } | null
  >(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (username === (profile.username ?? "") || username.length < 3) return;
    let cancelled = false;
    const id = setTimeout(() => {
      checkUsernameAvailable(username).then((r) => {
        if (!cancelled) setUsernameState(r.available ? { ok: true } : { ok: false, message: r.reason ?? "" });
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [username, profile.username]);

  const upload = async (file: File) => {
    if (!isValidImageType(file.type) || !isValidImageSize(file.size, 5)) {
      toast.error(t("photoInvalid"));
      return;
    }
    setUploading(true);
    try {
      const result = await generateProfilePictureUploadUrl(file.type, file.size);
      if (result.error || !result.uploadUrl) throw new Error(result.error);
      const response = await fetch(result.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!response.ok) throw new Error("Upload failed");
      setPhoto(result.publicUrl ?? null);
    } catch {
      toast.error(t("photoFailed"));
    } finally {
      setUploading(false);
    }
  };

  const usernameError =
    username.length > 0 && username.length < 3
      ? t("usernameHint")
      : usernameState && !usernameState.ok
        ? usernameState.message
        : undefined;

  const save = () =>
    startTransition(async () => {
      const result = await updateProfileFields({
        displayName,
        username,
        bio,
        profilePictureUrl: photo,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("saved"));
      onOpenChange(false);
      router.refresh();
    });

  const name = displayName || username || "?";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={t("title")}
        size="lg"
        onDone={save}
        doneDisabled={pending || uploading || !!usernameError || username.length < 3 || bio.length > BIO_MAX}
        doneLabel={t("save")}
        closeLabel={t("cancel")}
        className="max-md:top-2"
      >
        <div className="flex flex-col items-center pt-2">
          <AvatarTile name={name} src={photo} size={96} />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-3 cursor-pointer text-[15px] font-semibold text-pink-ink hover:underline disabled:opacity-60"
          >
            {uploading ? t("uploading") : photo ? t("changePhoto") : t("addPhoto")}
          </button>
        </div>
        <div className="mt-6 flex flex-col gap-5">
          <FieldInput
            label={t("displayName")}
            value={displayName}
            maxLength={100}
            autoComplete="name"
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <FieldInput
            label={t("username")}
            value={username}
            maxLength={30}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => {
              setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ""));
              setUsernameState(null);
            }}
            trailing={
              usernameState?.ok && username !== profile.username ? (
                <span className="flex items-center gap-1 text-[15px] font-semibold text-pink-ink">
                  <Icon name="check" size={14} strokeWidth={2.4} />
                  {t("available")}
                </span>
              ) : null
            }
            error={usernameError}
            hint={t("usernameHint")}
          />
          <div>
            <FieldInput
              label={t("bio")}
              multiline
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <p className={bio.length > BIO_MAX ? "mt-1.5 text-right text-[13px] text-negative tnum" : "mt-1.5 text-right text-[13px] text-ink-3 tnum"}>
              {t("counter", { count: bio.length, max: BIO_MAX.toLocaleString() })}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
