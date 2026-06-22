/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/image-upload";
import { IconPickerModal } from "@/components/collections/icon-picker-modal";
import { ColorPickerDialog } from "@/components/collections/color-picker-dialog";
import {
  createCollection,
  updateCollection,
  generateCollectionCoverUrl,
} from "@/app/[locale]/actions/collections";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { COLORS, DEFAULT_COLOR, getColorClass, type ColorValue } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface Collection {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  colorTag?: string | null;
  iconName?: string | null;
  coverImageUrl?: string | null;
}

interface CollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection?: Collection | null;
  onSuccess?: () => void;
}

export function CollectionDialog({
  open,
  onOpenChange,
  collection,
  onSuccess,
}: CollectionDialogProps) {
  const isEditing = !!collection;
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("collections.dialog");
  const tToast = useTranslations("collections.toast");

  const [formData, setFormData] = useState({
    name: collection?.name || "",
    description: collection?.description || "",
    isPublic: collection?.isPublic || false,
    colorTag: (collection?.colorTag as ColorValue) || DEFAULT_COLOR,
    iconName: collection?.iconName || "book",
  });

  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    collection?.coverImageUrl || null
  );

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [coverImageBlurhash, setCoverImageBlurhash] = useState<string | null>(null);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  // Reset image state when dialog closes
  useEffect(() => {
    if (!open) {
      setCoverImageBlurhash(null);
    }
  }, [open]);

  const handleImageUpload = async (previewUrl: string, blurhash: string) => {
    setCoverImageBlurhash(blurhash);
    if (!collection?.id && !isEditing) {
      setCoverImageUrl(previewUrl);
      return;
    }

    setIsUploadingImage(true);
    try {
      const file = (window as any).__pendingUploadFile as File;
      if (!file) throw new Error("No file to upload");

      const extension = file.name.split(".").pop() || "jpg";
      const result = await generateCollectionCoverUrl(collection!.id, extension);

      if (result.error || !result.uploadUrl || !result.publicUrl) {
        throw new Error(result.error || "Failed to generate upload URL");
      }

      const uploadResponse = await fetch(result.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload image to S3");

      const updateResult = await updateCollection(collection!.id, {
        coverImageUrl: result.publicUrl,
        coverImageBlurhash: blurhash,
      });

      if (updateResult.error) throw new Error(updateResult.error);

      setCoverImageUrl(result.publicUrl);
      toast.success(tToast("coverUploaded"));
      delete (window as any).__pendingUploadFile;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(tToast("coverUploadFailed"));
      setCoverImageUrl(null);
      setCoverImageBlurhash(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setCoverImageUrl(null);
    setCoverImageBlurhash(null);
    delete (window as any).__pendingUploadFile;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error(tToast("nameRequired"));
      return;
    }

    startTransition(async () => {
      try {
        if (isEditing) {
          // Update existing collection
          const result = await updateCollection(collection.id, {
            name: formData.name,
            description: formData.description || undefined,
            isPublic: formData.isPublic,
            colorTag: formData.colorTag,
            iconName: formData.iconName,
          });

          if (result.error) {
            toast.error(result.error);
            return;
          }

          toast.success(tToast("updated"));
        } else {
          // Create new collection
          const result = await createCollection({
            name: formData.name,
            description: formData.description || undefined,
            isPublic: formData.isPublic,
            colorTag: formData.colorTag,
            iconName: formData.iconName,
          });

          if (result.error) {
            toast.error(result.error);
            return;
          }

          // If there's a pending cover image, upload it now
          const file = (window as any).__pendingUploadFile as File;
          if (file && result.collection) {
            try {
              const extension = file.name.split(".").pop() || "jpg";
              const uploadResult = await generateCollectionCoverUrl(
                result.collection.id,
                extension
              );

              if (uploadResult.uploadUrl && uploadResult.publicUrl) {
                const uploadResponse = await fetch(uploadResult.uploadUrl, {
                  method: "PUT",
                  body: file,
                  headers: {
                    "Content-Type": file.type,
                  },
                });

                if (uploadResponse.ok) {
                  await updateCollection(result.collection.id, {
                    coverImageUrl: uploadResult.publicUrl,
                    coverImageBlurhash: coverImageBlurhash ?? undefined,
                  });
                }
              }

              delete (window as any).__pendingUploadFile;
            } catch (error) {
              console.error("Error uploading cover:", error);
              // Don't fail the whole operation if image upload fails
            }
          }

          toast.success(tToast("created"));
        }

        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }

        // Reset form
        setFormData({
          name: "",
          description: "",
          isPublic: false,
          colorTag: DEFAULT_COLOR,
          iconName: "book",
        });
        setCoverImageUrl(null);
        setCoverImageBlurhash(null);
      } catch (error) {
        console.error("Error saving collection:", error);
        toast.error(tToast("saveFailed"));
      }
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("editDescription")
              : t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={t("namePlaceholder")}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("descriptionLabel")}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder={t("descriptionPlaceholder")}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="space-y-4">
            {/* Color Theme */}
            <div className="space-y-2">
              <Label>{t("colorLabel")}</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsColorPickerOpen(true)}
                className="w-full justify-start gap-3 h-auto py-3"
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full",
                    getColorClass(formData.colorTag, "bg")
                  )}
                />
                <span>{COLORS.find((c) => c.value === formData.colorTag)?.name || "Select color"}</span>
              </Button>
            </div>

            {/* Icon */}
            <div className="space-y-2">
              <Label>{t("iconLabel")}</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsIconPickerOpen(true)}
                className="w-full justify-start gap-3 h-auto py-3"
              >
                <DynamicIcon name={formData.iconName as any} className="h-6 w-6" />
                <span className="capitalize">{formData.iconName.replace(/-/g, " ")}</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("coverLabel")}</Label>
            <ImageUpload
              onUpload={handleImageUpload}
              currentImageUrl={coverImageUrl || undefined}
              onRemove={handleRemoveImage}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="public">{t("publicLabel")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("publicDescription")}
              </p>
            </div>
            <Switch
              id="public"
              checked={formData.isPublic}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isPublic: checked })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending || isUploadingImage}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending || isUploadingImage}>
              {isPending || isUploadingImage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploadingImage ? t("uploading") : t("saving")}
                </>
              ) : isEditing ? (
                t("updateButton")
              ) : (
                t("createButton")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ColorPickerDialog
      open={isColorPickerOpen}
      onOpenChange={setIsColorPickerOpen}
      selectedColor={formData.colorTag}
      onSelectColor={(colorTag) =>
        setFormData({ ...formData, colorTag })
      }
    />

    <IconPickerModal
      open={isIconPickerOpen}
      onOpenChange={setIsIconPickerOpen}
      selectedIcon={formData.iconName}
      onSelectIcon={(iconName) =>
        setFormData({ ...formData, iconName })
      }
    />
  </>
  );
}
