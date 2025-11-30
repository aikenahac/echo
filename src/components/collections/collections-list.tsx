"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Loader2 } from "lucide-react";
import { CollectionSidebarItem } from "./collection-sidebar-item";
import { CollectionDialog } from "./collection-dialog";
import { getUserCollections } from "@/app/[locale]/actions/collections";

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

export function CollectionsList() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadCollections = async () => {
    setIsLoading(true);
    try {
      const result = await getUserCollections();
      if (result.collections) {
        setCollections(result.collections);
      }
    } catch (error) {
      console.error("Failed to load collections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const handleUpdate = () => {
    loadCollections();
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Collections
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowCreateDialog(true)}
            title="Create collection"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : collections.length === 0 ? (
          <div className="px-2 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              No collections yet
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="mt-1"
            >
              Create your first
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {collections.map((collection) => (
              <CollectionSidebarItem
                key={collection.id}
                collection={collection}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>

      <Separator className="my-4" />

      <CollectionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleUpdate}
      />
    </>
  );
}
