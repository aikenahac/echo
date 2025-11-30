"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Book,
  Bookmark,
  Heart,
  Star,
  Library,
  Sparkles,
  Flame,
  Crown,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
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

const ICON_MAP = {
  book: Book,
  bookmark: Bookmark,
  heart: Heart,
  star: Star,
  library: Library,
  sparkles: Sparkles,
  flame: Flame,
  crown: Crown,
};

const COLOR_MAP = {
  blue: "text-blue-500",
  green: "text-green-500",
  purple: "text-purple-500",
  red: "text-red-500",
  yellow: "text-yellow-500",
  pink: "text-pink-500",
  orange: "text-orange-500",
  teal: "text-teal-500",
};

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
  onUpdate?: () => void;
}

export function CollectionSidebarItem({
  collection,
  onUpdate,
}: CollectionSidebarItemProps) {
  const pathname = usePathname();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const Icon =
    ICON_MAP[collection.iconName as keyof typeof ICON_MAP] || Book;
  const colorClass =
    COLOR_MAP[collection.colorTag as keyof typeof COLOR_MAP] ||
    "text-blue-500";

  const isActive = pathname.includes(`/collections/${collection.slug}`);

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
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (error) {
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
          <Icon className={cn("h-4 w-4 shrink-0", colorClass)} />
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
              <MoreVertical className="h-4 w-4" />
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
        onSuccess={onUpdate}
      />
    </>
  );
}
