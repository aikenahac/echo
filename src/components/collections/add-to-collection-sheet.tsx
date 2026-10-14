"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  addBookToCollection,
  getUserCollections,
  hasCollectionAccess,
  removeBookFromCollection,
} from "@/app/[locale]/actions/collections";
import { Icon } from "@/components/echo/icons";
import { Sheet, SheetContent } from "@/components/echo/sheet";
import { CollectionTile } from "@/components/library/collection-tile";
import { PremiumPaywallDialog } from "@/components/premium-paywall-dialog";
import { cn } from "@/lib/utils";
import { CollectionEditor } from "./collection-editor";

type SheetCollection = {
  id: string;
  name: string;
  colorTag: string | null;
  iconName: string | null;
  isPublic: boolean;
  books?: { userBookId: string }[];
};

/**
 * Add or remove a book from collections: colour/icon tile, name, count and a
 * round check per row, then "New collection". Free users get the paywall.
 */
export function AddToCollectionSheet({
  userBookId,
  bookTitle,
  open,
  onOpenChange,
}: {
  userBookId: string;
  bookTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("collections.addTo");
  const tToast = useTranslations("collections.toast");
  const [collections, setCollections] = useState<SheetCollection[] | null>(null);
  const [hasPremium, setHasPremium] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [paywall, setPaywall] = useState(false);

  const load = () =>
    Promise.all([getUserCollections(), hasCollectionAccess()]).then(
      ([result, access]) => {
        setHasPremium(!!access.hasAccess);
        if (!access.hasAccess) {
          onOpenChange(false);
          setPaywall(true);
          return;
        }
        if (result.error) toast.error(result.error);
        setCollections(result.collections ?? []);
      },
    );

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = async (c: SheetCollection) => {
    const inIt = !!c.books?.some((b) => b.userBookId === userBookId);
    setBusy(c.id);
    const result = inIt
      ? await removeBookFromCollection(c.id, userBookId)
      : await addBookToCollection(c.id, userBookId);
    setBusy(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setCollections((prev) =>
      (prev ?? []).map((x) =>
        x.id !== c.id
          ? x
          : {
              ...x,
              books: inIt
                ? (x.books ?? []).filter((b) => b.userBookId !== userBookId)
                : [...(x.books ?? []), { userBookId }],
            },
      ),
    );
    toast.success(inIt ? tToast("removed") : tToast("added"));
  };

  return (
    <>
      <Sheet open={open && hasPremium !== false} onOpenChange={onOpenChange}>
        <SheetContent
          title={t("sheetTitle")}
          description={t("sheetSub", { title: bookTitle })}
        >
          {collections === null ? (
            <div className="flex flex-col gap-3 py-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-tint" />
              ))}
            </div>
          ) : (
            <ul>
              {collections.map((c) => {
                const on = !!c.books?.some((b) => b.userBookId === userBookId);
                return (
                  <li key={c.id} className="[&+li]:hairline-t">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      disabled={busy === c.id}
                      onClick={() => toggle(c)}
                      className="flex w-full cursor-pointer items-center gap-3.5 py-[13px] text-left disabled:opacity-60"
                    >
                      <CollectionTile colorTag={c.colorTag} iconName={c.iconName} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[17px] font-semibold tracking-[-0.4px]">
                          {c.name}
                        </span>
                        <span className="block text-[13px] text-ink-2">
                          {t("meta", {
                            count: c.books?.length ?? 0,
                            visibility: c.isPublic ? t("public") : t("private"),
                          })}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "grid size-[26px] flex-none place-items-center rounded-full border-[1.5px]",
                          on ? "border-ink bg-ink text-paper" : "border-ink-3",
                        )}
                      >
                        {on && <Icon name="check" size={16} strokeWidth={2.4} />}
                      </span>
                    </button>
                  </li>
                );
              })}
              <li className={collections.length ? "hairline-t" : ""}>
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full cursor-pointer items-center gap-3.5 py-[13px] text-[17px] font-semibold text-pink-ink"
                >
                  <span className="grid size-10 place-items-center rounded-lg bg-tint">
                    <Icon name="plus" size={20} />
                  </span>
                  {t("newCollection")}
                </button>
              </li>
            </ul>
          )}
        </SheetContent>
      </Sheet>
      <CollectionEditor
        key={String(creating)}
        open={creating}
        onOpenChange={setCreating}
        onSaved={() => load()}
      />
      <PremiumPaywallDialog open={paywall} onOpenChange={setPaywall} />
    </>
  );
}
