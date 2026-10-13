"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { IconButton } from "@/components/echo/buttons";
import { Icon } from "@/components/echo/icons";
import { ScreenTitle } from "@/components/echo/primitives";
import { useLibraryLayout } from "@/hooks/use-library-layout";
import type { LibraryLayout } from "@/lib/library-layout-cookie";
import { cn } from "@/lib/utils";

export type Shelf = "reading" | "want" | "finished" | "favourites";
export const SHELVES: Shelf[] = ["reading", "want", "finished", "favourites"];

/** "Library", the grid/list toggle and the shelf tabs with counts. */
export function LibraryHeader({
  shelf,
  counts,
  layout: initialLayout,
  showToggle,
}: {
  shelf: Shelf;
  counts: Record<Shelf, number>;
  layout: LibraryLayout;
  showToggle: boolean;
}) {
  const t = useTranslations("shelf");
  const router = useRouter();
  const { layout, setLayout } = useLibraryLayout(initialLayout);
  const next = layout === "grid" ? "list" : "grid";

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 pt-[max(12px,env(safe-area-inset-top))] md:px-10 md:pt-10">
      <div className="flex h-[52px] items-center justify-between">
        <ScreenTitle>{t("title")}</ScreenTitle>
        {showToggle && (
          <IconButton
            label={t(next)}
            onClick={() => {
              setLayout(next);
              router.refresh();
            }}
          >
            <Icon name={layout === "grid" ? "grid" : "list"} />
          </IconButton>
        )}
      </div>
      <nav
        aria-label={t("shelfLabel")}
        className="mt-2.5 flex gap-[18px] overflow-x-auto border-b border-rule text-[15px] whitespace-nowrap [scrollbar-width:none] md:mt-5 md:gap-7 md:text-[17px]"
      >
        {SHELVES.map((s) => {
          const on = s === shelf;
          return (
            <Link
              key={s}
              href={s === "reading" ? "/library" : `/library?shelf=${s}`}
              aria-current={on ? "page" : undefined}
              className={cn(
                "pt-2.5 pb-[11px] transition-colors",
                on
                  ? "font-semibold text-ink shadow-[inset_0_-2px_0_currentColor]"
                  : "text-ink-2 hover:text-ink",
              )}
            >
              {t(`shelves.${s}`)}
              <i className="ml-[3px] text-[13px] not-italic tnum md:text-[15px]">
                {counts[s]}
              </i>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
