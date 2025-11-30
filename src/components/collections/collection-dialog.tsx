"use client";

import { useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/image-upload";
import {
  createCollection,
  updateCollection,
  generateCollectionCoverUrl,
} from "@/app/[locale]/actions/collections";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Predefined color options
const COLOR_OPTIONS = [
  { value: "blue", label: "Blue", color: "bg-blue-500" },
  { value: "green", label: "Green", color: "bg-green-500" },
  { value: "purple", label: "Purple", color: "bg-purple-500" },
  { value: "red", label: "Red", color: "bg-red-500" },
  { value: "yellow", label: "Yellow", color: "bg-yellow-500" },
  { value: "pink", label: "Pink", color: "bg-pink-500" },
  { value: "orange", label: "Orange", color: "bg-orange-500" },
  { value: "teal", label: "Teal", color: "bg-teal-500" },
];

// Predefined icon options (using Lucide icon names)
const ICON_OPTIONS = [
  { value: "book", label: "Book" },
  { value: "bookmark", label: "Bookmark" },
  { value: "heart", label: "Heart" },
  { value: "star", label: "Star" },
  { value: "library", label: "Library" },
  { value: "sparkles", label: "Sparkles" },
  { value: "flame", label: "Flame" },
  { value: "crown", label: "Crown" },
];

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

  const [formData, setFormData] = useState({
    name: collection?.name || "",
    description: collection?.description || "",
    isPublic: collection?.isPublic || false,
    colorTag: collection?.colorTag || "blue",
    iconName: collection?.iconName || "book",
  });

  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    collection?.coverImageUrl || null
  );

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (previewUrl: string) => {
    if (!collection?.id && !isEditing) {
      // For new collections, just store the preview
      setCoverImageUrl(previewUrl);
      return;
    }

    // For existing collections, upload immediately
    setIsUploadingImage(true);
    try {
      // Get the file from the temporary storage
      const file = (window as any).__pendingUploadFile as File;
      if (!file) {
        throw new Error("No file to upload");
      }

      // Get file extension
      const extension = file.name.split(".").pop() || "jpg";

      // Generate presigned URL
      const result = await generateCollectionCoverUrl(collection!.id, extension);

      if (result.error || !result.uploadUrl || !result.publicUrl) {
        throw new Error(result.error || "Failed to generate upload URL");
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
        throw new Error("Failed to upload image to S3");
      }

      // Update collection with new image URL
      const updateResult = await updateCollection(collection!.id, {
        coverImageUrl: result.publicUrl,
      });

      if (updateResult.error) {
        throw new Error(updateResult.error);
      }

      setCoverImageUrl(result.publicUrl);
      toast.success("Cover image uploaded successfully");

      // Clean up
      delete (window as any).__pendingUploadFile;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload cover image");
      setCoverImageUrl(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setCoverImageUrl(null);
    delete (window as any).__pendingUploadFile;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Collection name is required");
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

          toast.success("Collection updated successfully");
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
                  });
                }
              }

              delete (window as any).__pendingUploadFile;
            } catch (error) {
              console.error("Error uploading cover:", error);
              // Don't fail the whole operation if image upload fails
            }
          }

          toast.success("Collection created successfully");
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
          colorTag: "blue",
          iconName: "book",
        });
        setCoverImageUrl(null);
      } catch (error) {
        console.error("Error saving collection:", error);
        toast.error("Failed to save collection");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Collection" : "Create Collection"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your collection details"
              : "Create a custom collection to organize your books"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Summer Reading List"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Optional description for your collection"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Color Theme</Label>
              <Select
                value={formData.colorTag}
                onValueChange={(value) =>
                  setFormData({ ...formData, colorTag: value })
                }
              >
                <SelectTrigger id="color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-4 w-4 rounded-full ${color.color}`}
                        />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Select
                value={formData.iconName}
                onValueChange={(value) =>
                  setFormData({ ...formData, iconName: value })
                }
              >
                <SelectTrigger id="icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      {icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cover Image</Label>
            <ImageUpload
              onUpload={handleImageUpload}
              currentImageUrl={coverImageUrl || undefined}
              onRemove={handleRemoveImage}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="public">Public Collection</Label>
              <p className="text-sm text-muted-foreground">
                Allow others to discover and follow this collection
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
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isUploadingImage}>
              {isPending || isUploadingImage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploadingImage ? "Uploading..." : "Saving..."}
                </>
              ) : isEditing ? (
                "Update Collection"
              ) : (
                "Create Collection"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
