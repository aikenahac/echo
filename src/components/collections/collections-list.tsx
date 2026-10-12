"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Crown } from "lucide-react";
import { CollectionSidebarItem } from "./collection-sidebar-item";
import { CollectionDialog } from "./collection-dialog";
import { PremiumPaywallDialog } from "@/components/premium-paywall-dialog";

export interface SidebarCollection {
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

interface CollectionsListProps {
  collections: SidebarCollection[];
  hasCollectionAccess: boolean;
}

// Collections are fetched by the page. The create/update/delete actions
// revalidate /library, which refreshes the current route with fresh props.
export function CollectionsList({
  collections,
  hasCollectionAccess: hasPremium,
}: CollectionsListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const handleCreateClick = () => {
    if (!hasPremium) {
      setShowPaywall(true);
    } else {
      setShowCreateDialog(true);
    }
  };

  return (
    <>
      <Separator className="my-4" />

      <div className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Collections
            </h3>
            {!hasPremium && (
              <Crown className="h-3 w-3 text-yellow-600" />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCreateClick}
            title={hasPremium ? "Create collection" : "Premium feature"}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {collections.length === 0 ? (
          <div className="px-2 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              No collections yet
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={handleCreateClick}
              className="mt-1"
            >
              {hasPremium ? "Create your first" : "Upgrade to create"}
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {collections.map((collection) => (
              <CollectionSidebarItem
                key={collection.id}
                collection={collection}
              />
            ))}
          </div>
        )}
      </div>

      <CollectionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <PremiumPaywallDialog
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="Custom Collections"
        description="Create and organize custom collections to group your books by theme, genre, or any category you choose."
      />
    </>
  );
}
