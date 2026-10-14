"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { CollectionEditor } from "@/components/collections/collection-editor";
import { PremiumPaywallDialog } from "@/components/premium-paywall-dialog";
import { Capsule } from "@/components/echo/buttons";
import { Cover } from "@/components/echo/cover";
import { Icon } from "@/components/echo/icons";
import { GroupLabel, ProgressBar } from "@/components/echo/primitives";
import type { UserBook } from "@/types";
import { CollectionTile } from "./collection-tile";

export type LibraryCollection = {
  id: string;
  slug: string;
  name: string;
  colorTag: string | null;
  iconName: string | null;
  bookCount: number;
};

const THREE_WEEKS = 1000 * 60 * 60 * 24 * 21;

/** Not touched in three weeks: show when it was last opened instead. */
function isStale(updated: Date) {
  return Date.now() - updated.getTime() > THREE_WEEKS;
}

/** Other books in progress: cover, two-line title, progress bar, pages. */
export function AlsoReading({ books }: { books: UserBook[] }) {
  const t = useTranslations("shelf");
  const format = useFormatter();
  if (books.length === 0) return null;
  return (
    <section>
      <GroupLabel className="mb-1">{t("alsoReading")}</GroupLabel>
      <ul>
        {books.map((ub) => {
          const total = ub.pageCount || ub.book.pages || 0;
          const page = ub.currentPage ?? 0;
          const updated = new Date(ub.updatedAt);
          const stale = isStale(updated);
          return (
            <li key={ub.id} className="[&+li]:hairline-t">
              <Link
                href={`/books/${ub.book.id}`}
                className="flex items-center gap-3.5 py-3 hover:opacity-90"
              >
                <Cover width={40} src={ub.book.coverUrl} title={ub.book.title} author={ub.book.author} />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[17px] leading-[21px] font-semibold tracking-[-0.4px]">
                    {ub.book.title}
                  </span>
                  <span className="mt-1.5 flex min-w-0 items-center gap-2.5">
                    <ProgressBar value={page} max={total} />
                    <span className="text-[13px] whitespace-nowrap text-ink-2 tnum">
                      {stale
                        ? t("lastOpened", {
                            date: format.dateTime(updated, { day: "numeric", month: "short" }),
                          })
                        : `${page} / ${total || "?"}`}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Collections as colour/icon tiles; "New collection" (paywall when free). */
export function CollectionsStrip({
  collections,
  hasAccess,
}: {
  collections: LibraryCollection[];
  hasAccess: boolean;
}) {
  const t = useTranslations("shelf");
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [paywall, setPaywall] = useState(false);

  return (
    <section>
      <GroupLabel className="mb-1">{t("collections")}</GroupLabel>
      <ul>
        {collections.map((c) => (
          <li key={c.id} className="[&+li]:hairline-t">
            <Link
              href={`/library/collections/${c.slug}`}
              className="flex items-center gap-3.5 py-3 hover:opacity-90"
            >
              <CollectionTile colorTag={c.colorTag} iconName={c.iconName} />
              <span className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-[-0.4px]">
                {c.name}
              </span>
              <span className="text-[13px] text-ink-2 tnum">{c.bookCount}</span>
              <Icon name="forward" size={16} className="text-ink-3" />
            </Link>
          </li>
        ))}
        <li className={collections.length ? "hairline-t" : ""}>
          <button
            type="button"
            onClick={() => (hasAccess ? setCreating(true) : setPaywall(true))}
            className="flex w-full cursor-pointer items-center gap-3.5 py-3 text-[17px] font-semibold text-pink-ink"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-tint">
              <Icon name="plus" size={20} />
            </span>
            {t("newCollection")}
          </button>
        </li>
      </ul>
      <CollectionEditor
        key={String(creating)}
        open={creating}
        onOpenChange={setCreating}
        onSaved={(saved) => {
          if (saved?.slug) router.push(`/library/collections/${saved.slug}`);
          else router.refresh();
        }}
      />
      <PremiumPaywallDialog open={paywall} onOpenChange={setPaywall} />
    </section>
  );
}

/** Empty Reading shelf: a dashed cover slot and a way to Search. */
export function EmptyReadingHero() {
  const t = useTranslations("shelf.empty");
  return (
    <div className="mx-auto grid w-full max-w-[1180px] grid-cols-[auto_1fr] items-end gap-5 px-5 pt-6 pb-8 md:gap-10 md:px-10 md:pt-10 md:pb-12">
      <Link
        href="/search"
        aria-label={t("findBook")}
        className="grid aspect-[2/3] w-[120px] place-items-center rounded-[3px] border-2 border-dashed border-current opacity-70 hover:opacity-100 md:w-[200px]"
      >
        <Icon name="plus" size={28} />
      </Link>
      <div className="min-w-0">
        <h2 className="font-disp text-[44px] leading-[.95] tracking-[-0.4px] md:text-[64px]">
          {t("readingTitle")}
        </h2>
      </div>
      <div className="col-span-2 md:col-span-1 md:col-start-2 md:-mt-2 md:max-w-[460px]">
        <p className="text-[15px] leading-5 text-ink-2 md:text-[17px] md:leading-6">
          {t("readingBody")}
        </p>
        <Capsule asChild variant="field" className="mt-5 w-full md:w-auto md:px-10">
          <Link href="/search">
            <Icon name="search" size={20} />
            {t("findBook")}
          </Link>
        </Capsule>
      </div>
    </div>
  );
}

export function FriendsNote() {
  const t = useTranslations("shelf.empty");
  const tNav = useTranslations("navigation");
  return (
    <section className="max-w-[46ch]">
      <GroupLabel>{tNav("feed")}</GroupLabel>
      <p className="mt-1 text-[15px] leading-5">{t("friendsNote")}</p>
      <Link
        href="/search?tab=readers"
        className="mt-2 inline-block text-[15px] font-semibold text-pink-ink hover:underline"
      >
        {t("findReaders")}
      </Link>
    </section>
  );
}
