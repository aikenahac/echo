"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
import { addBookToLibrary } from "@/app/[locale]/actions/books";
import {
  recordOpenLibrarySearch,
  searchCatalog,
} from "@/app/[locale]/actions/search";
import {
  OPEN_LIBRARY_PAGE_SIZE,
  searchOpenLibrary,
  docToResult,
  mergeResults,
  rankResults,
  type SearchResult,
} from "@/lib/open-library";
import { Capsule } from "@/components/echo/buttons";
import { Cover } from "@/components/echo/cover";
import { Icon } from "@/components/echo/icons";
import { Stamp } from "@/components/echo/stamp";
import type { ReadingStatus } from "@/types";

/** The viewer's library, keyed by book id and by ISBN. */
export type Owned = Record<string, { bookId: string; status: ReadingStatus; rating: number | null }>;

const MAX_PAGE = 50;

/**
 * One page of results. Our server answers first (catalog books, plus Open
 * Library's results when we stored them). Otherwise this browser asks Open
 * Library directly, so the request comes from the user's IP, then tells the
 * server what it saw so the next search for it is answered from storage.
 */
async function fetchPage(
  query: string,
  page: number,
  signal: AbortSignal,
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const stored = await searchCatalog(query, page);
  if ("error" in stored) throw new Error(stored.error);

  let external: SearchResult[];
  let numFound: number;
  if (stored.openLibrary.status === "hit") {
    external = stored.openLibrary.results;
    numFound = stored.openLibrary.numFound;
  } else {
    const found = await searchOpenLibrary(query, page, { signal });
    numFound = found.numFound;
    external = found.docs.map(docToResult);
    // Fire and forget; attach catalog ids when the answer arrives
    void recordOpenLibrarySearch({ query, page, numFound, docs: found.docs }).then(
      (res) => {
        if ("error" in res) return;
        for (const r of external) if (r.key && res.ids[r.key]) r.id = res.ids[r.key];
      },
    );
  }

  return {
    results: rankResults(external, stored.catalog),
    hasMore: page < MAX_PAGE && page * OPEN_LIBRARY_PAGE_SIZE < numFound,
  };
}

function ownedFor(owned: Owned, r: SearchResult) {
  return (r.id && owned[r.id]) || (r.isbn && owned[`isbn:${r.isbn}`]) || null;
}

export function BookResults({ query, owned: initialOwned }: { query: string; owned: Owned }) {
  const t = useTranslations("find");
  const tShelf = useTranslations("shelf");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [owned, setOwned] = useState(initialOwned);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    // Parent re-mounts this per query (key={query}), so state starts fresh
    fetchPage(query, 1, controller.signal)
      .then((r) => {
        if (controller.signal.aborted) return;
        setResults(r.results);
        setHasMore(r.hasMore);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        // Open Library is down or rate-limited us: show what we have
        setFailed(true);
        setResults([]);
      });
    return () => controller.abort();
  }, [query]);

  if (!query) {
    return <p className="mt-8 text-[15px] text-ink-2">{t("booksHint")}</p>;
  }

  if (results === null) {
    return (
      <ul className="mt-6" aria-busy>
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex gap-3.5 py-4 [&+li]:hairline-t">
            <div className="aspect-[2/3] w-16 animate-pulse rounded-[2px] bg-tint" />
            <div className="flex-1 pt-1">
              <div className="h-5 w-2/3 animate-pulse rounded bg-tint" />
              <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-tint" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (results.length === 0) {
    return (
      <p className="mt-8 text-[15px] text-ink-2">
        {failed ? t("searchFailed") : t("noBooks", { query })}
      </p>
    );
  }

  const add = (r: SearchResult, status: ReadingStatus) =>
    startTransition(async () => {
      const result = await addBookToLibrary(
        r.id ? { bookId: r.id } : { openLibrary: r.doc! },
        status,
      );
      if (result.error || !result.userBook) {
        toast.error(result.error);
        return;
      }
      const entry = { bookId: result.userBook.bookId, status, rating: null };
      setOwned((prev) => ({
        ...prev,
        [result.userBook!.bookId]: entry,
        ...(r.id ? { [r.id]: entry } : {}),
        ...(r.isbn ? { [`isbn:${r.isbn}`]: entry } : {}),
      }));
      toast.success(t("added", { shelf: tShelf(`shelves.${status}`) }));
    });

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await fetchPage(query, page + 1, new AbortController().signal);
      setResults(mergeResults(results, next.results));
      setHasMore(next.hasMore);
      setPage(page + 1);
    } catch {
      toast.error(t("searchFailed"));
    } finally {
      setLoadingMore(false);
    }
  };

  // Each run of results from the same source gets its source line

  return (
    <div className="mt-5">
      <ul>
        {results.map((r, i) => {
          const have = ownedFor(owned, r);
          const href = have ? `/books/${have.bookId}` : r.id ? `/books/${r.id}` : null;
          const showSource = i === 0 || results[i - 1].source !== r.source;
          return (
            <li key={r.id ?? r.key ?? `${r.title}-${i}`}>
              {showSource && (
                <p className={`flex items-center gap-1.5 text-[13px] text-ink-2 ${i > 0 ? "mt-6" : ""}`}>
                  <Icon name={r.source === "internal" ? "db" : "globe"} size={14} strokeWidth={2} />
                  {r.source === "internal" ? t("fromCatalog") : t("fromOpenLibrary")}
                </p>
              )}
              <div className={`flex gap-3.5 py-4 ${showSource ? "" : "hairline-t"}`}>
                <MaybeLink href={href}>
                  <div className="relative">
                    <Cover width={64} src={r.coverUrl} title={r.title} author={r.author} />
                    {have?.status === "finished" && (
                      <span className="absolute inset-x-0 bottom-1.5 flex justify-center">
                        <Stamp size="xs">{tShelf("finished")}</Stamp>
                      </span>
                    )}
                  </div>
                </MaybeLink>
                <div className="min-w-0 flex-1">
                  <MaybeLink href={href}>
                    <p className="font-disp text-[22px] leading-[1.05] font-extrabold tracking-[-0.2px] hover:underline">
                      {r.title}
                    </p>
                  </MaybeLink>
                  <p className="mt-1 truncate text-[15px] text-ink-2">{r.author}</p>
                  <p className="text-[13px] text-ink-2 tnum">
                    {[r.publishedYear, r.pages ? t("pp", { count: r.pages }) : null].filter(Boolean).join(" · ")}
                  </p>
                  {have ? (
                    <p className="mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-pink-ink">
                      <Icon name="check" size={14} strokeWidth={2.4} />
                      {have.rating
                        ? t("inLibraryRated", { status: tShelf(`shelves.${have.status}`), rating: have.rating })
                        : t("inLibrary", { status: tShelf(`shelves.${have.status}`) })}
                    </p>
                  ) : (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {(["want", "reading", "finished"] as const).map((s, idx) => (
                        <Capsule
                          key={s}
                          size="xs"
                          variant={idx === 0 ? "outline" : "quiet"}
                          disabled={pending}
                          onClick={() => add(r, s)}
                        >
                          {s === "want" && <Icon name="plus" size={14} strokeWidth={2} />}
                          {tShelf(`shelves.${s}`)}
                        </Capsule>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <Capsule variant="quiet" size="sm" className="mt-4 w-full" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? t("loading") : t("loadMore")}
        </Capsule>
      )}
    </div>
  );
}

function MaybeLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  return href ? <Link href={href} className="block">{children}</Link> : <>{children}</>;
}
