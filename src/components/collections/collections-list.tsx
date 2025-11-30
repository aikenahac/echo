"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Loader2, Crown } from "lucide-react";
import { CollectionSidebarItem } from "./collection-sidebar-item";
import { CollectionDialog } from "./collection-dialog";
import { PremiumPaywallDialog } from "@/components/premium-paywall-dialog";
import { getUserCollections, hasCollectionAccess } from "@/app/[locale]/actions/collections";

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
  const [showPaywall, setShowPaywall] = useState(false);
  const [hasPremium, setHasPremium] = useState(false);

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

  const checkPremiumAccess = async () => {
    const result = await hasCollectionAccess();
    setHasPremium(result.hasAccess || false);
  };

  useEffect(() => {
    loadCollections();
    checkPremiumAccess();
  }, []);

  const handleUpdate = () => {
    loadCollections();
  };

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
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>

      <CollectionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleUpdate}
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
