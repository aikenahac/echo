"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import {
  removeBookFromLibrary,
  toggleBookFavorite,
  updateBookStatus,
} from "@/app/[locale]/actions/books";
import { Capsule } from "@/components/echo/buttons";
import { Icon } from "@/components/echo/icons";
import { Sheet, SheetContent } from "@/components/echo/sheet";
import { AddToCollectionSheet } from "@/components/collections/add-to-collection-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReadingStatus } from "@/types";

/**
 * Status, favourite, add to collection and remove for one book in the
 * library. `trigger` defaults to a small ⋯ button.
 */
export function BookActionsMenu({
  userBookId,
  title,
  status,
  isFavorite,
  trigger,
  onRemoved,
  align = "end",
}: {
  userBookId: string;
  title: string;
  status: ReadingStatus;
  isFavorite: boolean;
  trigger?: React.ReactNode;
  onRemoved?: () => void;
  align?: "start" | "end";
}) {
  const t = useTranslations("shelf.actions");
  const tStatus = useTranslations("shelf.shelves");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      if (result.error) toast.error(result.error);
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <button
              type="button"
              aria-label={t("more", { title })}
              className="grid size-9 cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-tint hover:text-ink"
            >
              <Icon name="more" />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align}>
          <DropdownMenuLabel>{t("status")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={status}
            onValueChange={(v) =>
              run(() => updateBookStatus(userBookId, v as ReadingStatus))
            }
          >
            {(["want", "reading", "finished"] as const).map((s) => (
              <DropdownMenuRadioItem key={s} value={s}>
                {tStatus(s)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => run(() => toggleBookFavorite(userBookId, !isFavorite))}
          >
            <Icon name="heart" size={18} filled={isFavorite} className="text-pink-ink" />
            {isFavorite ? t("unfavourite") : t("favourite")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setCollectionOpen(true)}>
            <Icon name="folder" size={18} />
            {t("addToCollection")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Icon name="trash" size={18} />
            {t("remove")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddToCollectionSheet
        userBookId={userBookId}
        bookTitle={title}
        open={collectionOpen}
        onOpenChange={setCollectionOpen}
      />

      <ConfirmSheet
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("removeConfirmTitle", { title })}
        body={t("removeConfirm")}
        confirmLabel={t("remove")}
        cancelLabel={t("cancel")}
        onConfirm={() => {
          setConfirmOpen(false);
          startTransition(async () => {
            const result = await removeBookFromLibrary(userBookId);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            onRemoved?.();
            router.refresh();
          });
        }}
      />
    </>
  );
}

/** A destructive confirmation as a small sheet. */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={title} description={body} className="md:w-[420px]">
        <div className="flex flex-col gap-2.5 pt-2">
          <Capsule
            className="bg-negative text-white hover:bg-negative"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Capsule>
          <Capsule variant="ghost" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Capsule>
        </div>
      </SheetContent>
    </Sheet>
  );
}
