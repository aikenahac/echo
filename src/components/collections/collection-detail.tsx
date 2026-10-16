"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/routing";
import {
  deleteCollection,
  followCollection,
  removeBookFromCollection,
  unfollowCollection,
  updateCollection,
} from "@/app/[locale]/actions/collections";
import { AdminBadge } from "@/components/echo/admin-badge";
import { Capsule, IconButton, ToolbarButton, ToolbarGroup } from "@/components/echo/buttons";
import { Icon } from "@/components/echo/icons";
import { BookRows, CoverGrid } from "@/components/library/shelf-views";
import { CollectionTile } from "@/components/library/collection-tile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLibraryLayout } from "@/hooks/use-library-layout";
import { collectionColors } from "@/lib/colors";
import type { LibraryLayout } from "@/lib/library-layout-cookie";
import type { UserBook } from "@/types";
import { ConfirmSheet } from "@/components/library/book-actions-menu";
import { CollectionEditor, type EditableCollection } from "./collection-editor";

/**
 * A collection: a full-bleed banner in the collection's own colour (never the
 * pink field), then its books as a cover grid or rows.
 */
export function CollectionDetail({
  collection,
  books,
  isOwner,
  ownerName,
  ownerIsAdmin,
  isFollowing: initialFollowing,
  initialLayout,
}: {
  collection: EditableCollection;
  books: UserBook[];
  isOwner: boolean;
  ownerName: string;
  ownerIsAdmin: boolean;
  isFollowing: boolean;
  initialLayout: LibraryLayout;
}) {
  const t = useTranslations("coll");
  const tShelf = useTranslations("shelf");
  const router = useRouter();
  const { layout, setLayout } = useLibraryLayout(initialLayout);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [following, setFollowing] = useState(initialFollowing);
  const [, startTransition] = useTransition();
  const { background, foreground } = collectionColors(collection.colorTag);
  const cover = collection.coverImageUrl;

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      if (result.error) toast.error(result.error);
      router.refresh();
    });

  return (
    <>
      <header
        className="relative isolate overflow-hidden"
        style={{ background, color: cover ? "#FFFFFF" : foreground }}
      >
        {cover && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/10 via-black/25 to-black/70" />
          </>
        )}
        <div className="mx-auto w-full max-w-[1180px] px-5 pt-[max(12px,env(safe-area-inset-top))] pb-7 md:px-10 md:pt-8 md:pb-10">
          <div className="flex items-center justify-between [--glass:rgba(255,255,255,.35)] [&_.glass]:text-current">
            <IconButton label={t("back")} asChild>
              <Link href="/library">
                <Icon name="back" />
              </Link>
            </IconButton>
            <ToolbarGroup>
              <ToolbarButton
                label={layout === "grid" ? tShelf("list") : tShelf("grid")}
                className="text-current hover:bg-white/20"
                onClick={() => setLayout(layout === "grid" ? "list" : "grid")}
              >
                <Icon name={layout === "grid" ? "grid" : "list"} />
              </ToolbarButton>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <ToolbarButton label={t("more")} className="text-current hover:bg-white/20">
                      <Icon name="more" />
                    </ToolbarButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditing(true)}>
                      <Icon name="pen" size={18} />
                      {t("edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        run(() => updateCollection(collection.id, { isPublic: !collection.isPublic }))
                      }
                    >
                      <Icon name={collection.isPublic ? "lock" : "globe"} size={18} />
                      {collection.isPublic ? t("makePrivate") : t("makePublic")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                      <Icon name="trash" size={18} />
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </ToolbarGroup>
          </div>
          <div className={cover ? "pt-28 md:pt-40" : "pt-8 md:pt-12"}>
            <CollectionTile
              colorTag={collection.colorTag}
              iconName={collection.iconName}
              size={44}
              className="shadow-[0_0_0_1.5px_rgba(255,255,255,.5)]"
            />
            <h1 className="font-disp mt-4 text-[44px] leading-[.95] tracking-[-0.4px] md:text-[64px]">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="mt-2.5 max-w-[56ch] text-[17px] leading-6 opacity-85">
                {collection.description}
              </p>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold opacity-85">
              <Icon name={collection.isPublic ? "globe" : "lock"} size={14} strokeWidth={2} />
              {t("meta", {
                visibility: collection.isPublic ? t("public") : t("private"),
                count: books.length,
              })}
              {!isOwner && <span className="font-normal"> · {t("by", { name: ownerName })}</span>}
              {!isOwner && ownerIsAdmin && <AdminBadge size={13} />}
            </p>
            {!isOwner && (
              <Capsule
                size="sm"
                variant={following ? "outline" : "paper"}
                className="mt-4 border-current text-current"
                onClick={() => {
                  const next = !following;
                  setFollowing(next);
                  run(() => (next ? followCollection(collection.id) : unfollowCollection(collection.id)));
                }}
              >
                {following ? t("following") : t("follow")}
              </Capsule>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-5 pt-3 pb-12 md:px-10">
        {books.length === 0 ? (
          <p className="max-w-[46ch] py-10 text-[17px] leading-6 text-ink-2">{t("empty")}</p>
        ) : layout === "grid" ? (
          <CoverGrid books={books} actions={isOwner} />
        ) : (
          <BookRows books={books} actions={isOwner} />
        )}
        {isOwner && books.length > 0 && (
          <RemoveHint collectionId={collection.id} books={books} />
        )}
      </div>

      {isOwner && (
        <ConfirmSheet
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t("deleteTitle", { name: collection.name })}
          body={t("deleteBody")}
          confirmLabel={t("delete")}
          cancelLabel={t("cancel")}
          onConfirm={() =>
            startTransition(async () => {
              const result = await deleteCollection(collection.id);
              setConfirmDelete(false);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              router.push("/library");
            })
          }
        />
      )}
      {isOwner && (
        <CollectionEditor
          key={JSON.stringify(collection)}
          open={editing}
          onOpenChange={setEditing}
          collection={collection}
          onSaved={(saved) => {
            if (saved?.slug) router.replace(`/library/collections/${saved.slug}`);
            router.refresh();
          }}
          onDeleted={() => router.push("/library")}
        />
      )}
    </>
  );
}

/** Owner-only: take a book out of this collection. */
function RemoveHint({ collectionId, books }: { collectionId: string; books: UserBook[] }) {
  const t = useTranslations("coll");
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <details className="mt-10 text-[15px]">
      <summary className="cursor-pointer text-ink-2 hover:text-ink">{t("removeFromCollection")}</summary>
      <ul className="mt-2">
        {books.map((ub) => (
          <li key={ub.id} className="flex items-center justify-between gap-3 py-2 [&+li]:hairline-t">
            <span className="truncate">{ub.book.title}</span>
            <button
              type="button"
              className="cursor-pointer text-[13px] font-semibold text-negative"
              onClick={() =>
                startTransition(async () => {
                  const result = await removeBookFromCollection(collectionId, ub.id);
                  if (result.error) toast.error(result.error);
                  router.refresh();
                })
              }
            >
              {t("removeFromCollection")}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
