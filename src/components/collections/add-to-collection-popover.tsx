"use client";

import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Loader2, FolderPlus, Crown } from "lucide-react";
import {
  getUserCollections,
  addBookToCollection,
  removeBookFromCollection,
  hasCollectionAccess,
} from "@/app/[locale]/actions/collections";
import { toast } from "sonner";
import { CollectionDialog } from "./collection-dialog";
import { PremiumPaywallDialog } from "@/components/premium-paywall-dialog";
import { useTranslations } from "next-intl";

interface Collection {
  id: string;
  name: string;
  bookCount?: number;
  books?: Array<{
    userBookId: string;
  }>;
}

interface AddToCollectionPopoverProps {
  userBookId: string;
  trigger?: React.ReactNode;
}

export function AddToCollectionPopover({
  userBookId,
  trigger,
}: AddToCollectionPopoverProps) {
  const t = useTranslations("collections.addTo");
  const tToast = useTranslations("collections.toast");
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [hasPremium, setHasPremium] = useState(false);

  useEffect(() => {
    if (open) {
      loadCollections();
      checkPremiumAccess();
    }
  }, [open]);

  const checkPremiumAccess = async () => {
    const result = await hasCollectionAccess();
    setHasPremium(result.hasAccess || false);
  };

  const loadCollections = async () => {
    setIsLoading(true);
    try {
      const result = await getUserCollections();
      if (result.error) {
        toast.error(result.error);
      } else if (result.collections) {
        setCollections(result.collections);
      }
    } catch (error) {
      toast.error(tToast("loadFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const isBookInCollection = (collection: Collection): boolean => {
    return (
      collection.books?.some((b) => b.userBookId === userBookId) || false
    );
  };

  const handleToggle = async (collectionId: string, isInCollection: boolean) => {
    setProcessingIds((prev) => new Set(prev).add(collectionId));

    try {
      if (isInCollection) {
        // Remove from collection
        const result = await removeBookFromCollection(collectionId, userBookId);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(tToast("removed"));
          await loadCollections();
        }
      } else {
        // Add to collection
        const result = await addBookToCollection(collectionId, userBookId);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(tToast("added"));
          await loadCollections();
        }
      }
    } catch (error) {
      toast.error(tToast("updateFailed"));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(collectionId);
        return next;
      });
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    loadCollections();
  };

  const handleCreateClick = () => {
    if (!hasPremium) {
      setShowPaywall(true);
      setOpen(false);
    } else {
      setShowCreateDialog(true);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("button")}
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{t("title")}</h4>
                {!hasPremium && (
                  <Crown className="h-3 w-3 text-yellow-600" />
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCreateClick}
                title={hasPremium ? t("createTooltip") : t("premiumTooltip")}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                {t("new")}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : collections.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {hasPremium ? t("noCollections") : t("premiumFeature")}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleCreateClick}
                  className="mt-2"
                >
                  {hasPremium ? t("createFirst") : t("upgradeToPremium")}
                </Button>
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {collections.map((collection) => {
                    const isInCollection = isBookInCollection(collection);
                    const isProcessing = processingIds.has(collection.id);

                    return (
                      <div
                        key={collection.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={collection.id}
                          checked={isInCollection}
                          onCheckedChange={() =>
                            handleToggle(collection.id, isInCollection)
                          }
                          disabled={isProcessing}
                        />
                        <label
                          htmlFor={collection.id}
                          className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          <div className="flex items-center justify-between">
                            <span>{collection.name}</span>
                            {isProcessing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {collection.bookCount || 0}
                              </span>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <CollectionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
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
