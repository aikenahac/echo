"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Icon } from "@/components/echo/icons";
import { ScreenTitle } from "@/components/echo/primitives";
import { Segmented } from "@/components/echo/segmented";
import { BookResults, type Owned } from "./book-results";
import { ReaderResults, type Reader } from "./reader-results";

export type SearchTab = "books" | "readers";

/** Search: one field, Books / Readers, results under it. */
export function SearchView({
  tab,
  query,
  owned,
  readers,
  following,
}: {
  tab: SearchTab;
  query: string;
  owned: Owned;
  readers: Reader[];
  following: string[];
}) {
  const t = useTranslations("find");
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(query);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const push = (next: { q?: string; tab?: SearchTab }) => {
    const params = new URLSearchParams();
    const q = next.q ?? value;
    const nextTab = next.tab ?? tab;
    if (q.trim()) params.set("q", q.trim());
    if (nextTab !== "books") params.set("tab", nextTab);
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // Debounce typing into the URL (readers are searched on the server)
  useEffect(() => {
    if (value.trim() === query) return;
    const id = setTimeout(() => push({ q: value }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 pt-[max(12px,env(safe-area-inset-top))] pb-12 md:px-10 md:pt-10">
      <div className="flex h-[52px] items-center">
        <ScreenTitle>{t("title")}</ScreenTitle>
      </div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: value });
        }}
        className="mt-4 flex h-[52px] items-center gap-2 rounded-full border border-rule bg-input-bg px-4 focus-within:border-ink"
      >
        <Icon name="search" size={20} className="text-ink-2" />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoFocus
          aria-label={t("title")}
          placeholder={tab === "books" ? t("placeholderBooks") : t("placeholderReaders")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-[17px] caret-pink-ink outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            aria-label={t("clear")}
            onClick={() => {
              setValue("");
              push({ q: "" });
              inputRef.current?.focus();
            }}
            className="grid size-7 cursor-pointer place-items-center rounded-full bg-tint text-ink-2"
          >
            <Icon name="close" size={14} strokeWidth={2.2} />
          </button>
        )}
      </form>
      <Segmented
        className="mt-4 md:max-w-[360px]"
        label={t("tabsLabel")}
        value={tab}
        onChange={(next) => push({ tab: next })}
        options={[
          { value: "books", label: t("tabs.books") },
          { value: "readers", label: t("tabs.readers") },
        ]}
      />
      {tab === "books" ? (
        <BookResults key={query} query={query} owned={owned} />
      ) : (
        <ReaderResults query={query} readers={readers} following={following} />
      )}
    </div>
  );
}
