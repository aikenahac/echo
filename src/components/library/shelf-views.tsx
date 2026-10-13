"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Cover } from "@/components/echo/cover";
import { Icon } from "@/components/echo/icons";
import { Stars } from "@/components/echo/primitives";
import { Stamp } from "@/components/echo/stamp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LibraryLayout } from "@/lib/library-layout-cookie";
import type { UserBook } from "@/types";
import { BookActionsMenu } from "./book-actions-menu";
import type { Shelf } from "./library-header";

type Sort = "recent" | "added" | "title" | "author" | "rating";

function sortBooks(books: UserBook[], sort: Sort) {
  const by = [...books];
  const time = (d: Date | string | null | undefined) => (d ? new Date(d).getTime() : 0);
  switch (sort) {
    case "recent":
      return by.sort((a, b) => time(b.finishedAt ?? b.updatedAt) - time(a.finishedAt ?? a.updatedAt));
    case "added":
      return by.sort((a, b) => time(b.createdAt) - time(a.createdAt));
    case "title":
      return by.sort((a, b) => a.book.title.localeCompare(b.book.title));
    case "author":
      return by.sort((a, b) => a.book.author.localeCompare(b.book.author));
    case "rating":
      return by.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }
}

/** Want / Finished / Favourites on paper, as a cover grid or hairline rows. */
export function ShelfView({
  shelf,
  books,
  layout,
  finishedThisYear,
}: {
  shelf: Exclude<Shelf, "reading">;
  books: UserBook[];
  layout: LibraryLayout;
  finishedThisYear: number;
}) {
  const t = useTranslations("shelf");
  const [sort, setSort] = useState<Sort>(shelf === "finished" ? "recent" : "added");
  const sorted = useMemo(() => sortBooks(books, sort), [books, sort]);
  const pages = books.reduce(
    (sum, ub) => sum + (ub.pageCount || ub.book.pages || 0),
    0,
  );

  if (books.length === 0) {
    return (
      <p className="max-w-[46ch] py-10 text-[17px] leading-6 text-ink-2">
        {t(`empty.${shelf}`)}
      </p>
    );
  }

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between gap-4 pb-2">
        <p className="text-[13px] text-ink-2 tnum">
          {shelf === "finished"
            ? t("summary", { count: books.length, thisYear: finishedThisYear })
            : t("summaryPlain", { count: books.length })}
          {pages > 0 && <span className="max-sm:hidden"> · {pages.toLocaleString()} pp</span>}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex cursor-pointer items-center gap-1 text-[13px] font-semibold text-ink hover:text-pink-ink">
            {t(`sort.${sort}`)}
            <Icon name="chev" size={14} strokeWidth={2} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as Sort)}>
              {(["recent", "added", "title", "author", "rating"] as const).map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>
                  {t(`sort.${s}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {layout === "grid" ? <CoverGrid books={sorted} /> : <BookRows books={sorted} />}
    </div>
  );
}

export function CoverGrid({ books }: { books: UserBook[] }) {
  const t = useTranslations("shelf");
  return (
    <ul className="grid grid-cols-3 gap-x-4 gap-y-7 pt-3 sm:grid-cols-4 md:grid-cols-5 md:gap-x-6 lg:grid-cols-6">
      {books.map((ub) => (
        <li key={ub.id} className="group relative min-w-0">
          <Link href={`/books/${ub.book.id}`} className="block">
            <div className="relative">
              <Cover
                fluid
                width={110}
                src={ub.book.coverUrl}
                title={ub.book.title}
                author={ub.book.author}
                sizes="(min-width: 1024px) 200px, 33vw"
              />
              {ub.status === "finished" && (
                <span className="absolute inset-x-0 bottom-2 flex justify-center">
                  <Stamp size="xs" rotate={-7}>
                    {t("finished")}
                  </Stamp>
                </span>
              )}
            </div>
            <p className="mt-2.5 line-clamp-2 text-[13px] leading-[17px] font-semibold">
              {ub.book.title}
            </p>
            <p className="truncate text-[13px] leading-[17px] text-ink-2">{ub.book.author}</p>
          </Link>
          <div className="absolute top-1 right-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:hidden">
            <BookActionsMenu
              userBookId={ub.id}
              title={ub.book.title}
              status={ub.status}
              isFavorite={ub.isFavorite}
              trigger={
                <button
                  type="button"
                  aria-label={t("actions.more", { title: ub.book.title })}
                  className="glass grid size-8 cursor-pointer place-items-center rounded-full text-ink"
                >
                  <Icon name="more" size={18} />
                </button>
              }
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BookRows({ books }: { books: UserBook[] }) {
  const t = useTranslations("shelf");
  const format = useFormatter();
  return (
    <ul>
      {books.map((ub) => (
        <li key={ub.id} className="flex items-center gap-3.5 py-3 [&+li]:hairline-t">
          <Link href={`/books/${ub.book.id}`} className="flex min-w-0 flex-1 items-center gap-3.5">
            <Cover width={44} src={ub.book.coverUrl} title={ub.book.title} author={ub.book.author} />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[17px] leading-[21px] font-semibold tracking-[-0.4px]">
                {ub.book.title}
              </span>
              <span className="block truncate text-[13px] text-ink-2">{ub.book.author}</span>
            </span>
            <span className="flex flex-none flex-col items-end gap-1 text-[13px] text-ink-2 tnum">
              {ub.status === "finished" ? (
                <>
                  {ub.rating ? <Stars value={ub.rating} size={11} /> : <span>{t("notRated")}</span>}
                  {ub.finishedAt && (
                    <span>{format.dateTime(new Date(ub.finishedAt), { day: "numeric", month: "short" })}</span>
                  )}
                </>
              ) : ub.status === "reading" ? (
                <span>
                  {ub.currentPage ?? 0} / {ub.pageCount || ub.book.pages || "?"}
                </span>
              ) : null}
            </span>
          </Link>
          <BookActionsMenu
            userBookId={ub.id}
            title={ub.book.title}
            status={ub.status}
            isFavorite={ub.isFavorite}
          />
        </li>
      ))}
    </ul>
  );
}
