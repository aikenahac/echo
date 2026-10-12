"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  EllipsisVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { deleteCollection } from "@/app/[locale]/actions/collections";
import { toast } from "sonner";
import { CollectionDialog } from "./collection-dialog";
import { getColorClass } from "@/lib/colors";
import { useRouter } from "@/i18n/routing";

interface Collection {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  isPublic: boolean;
  colorTag?: string | null;
  iconName?: string | null;
  coverImageUrl?: string | null;
  bookCount?: number;
}

interface CollectionSidebarItemProps {
  collection: Collection;
}

// The delete/update actions revalidate /library, so the sidebar refreshes
// with fresh props without a manual refetch.
export function CollectionSidebarItem({
  collection,
}: CollectionSidebarItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const iconName = (collection.iconName || "book") as IconName;
  const colorClass = collection.colorTag
    ? getColorClass(collection.colorTag, "text")
    : "text-blue-500";

  const isActive = pathname.includes(`/library/collections/${collection.slug}`);

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${collection.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteCollection(collection.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Collection deleted successfully");
        // The page of a deleted collection no longer exists
        if (isActive) {
          router.replace("/library");
        }
      }
    } catch {
      toast.error("Failed to delete collection");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
          isActive && "bg-accent"
        )}
      >
        <Link
          href={`/library/collections/${collection.slug}`}
          className="flex flex-1 items-center gap-2 overflow-hidden"
        >
          <DynamicIcon name={iconName} className={cn("h-4 w-4 shrink-0", colorClass)} />
          <span className="truncate">{collection.name}</span>
          {collection.bookCount !== undefined && (
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {collection.bookCount}
            </span>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <EllipsisVertical className="h-4 w-4" />
              <span className="sr-only">Collection options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              {collection.isPublic ? (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Public
                </>
              ) : (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Private
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CollectionDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        collection={collection}
        onSuccess={(updated) => {
          // Renaming changes the slug, so follow it when viewing this collection
          if (isActive && updated && updated.slug !== collection.slug) {
            router.replace(`/library/collections/${updated.slug}`);
          }
        }}
      />
    </>
  );
}
