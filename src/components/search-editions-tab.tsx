"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Search, Loader2 } from "lucide-react";
import { searchEditionsByTitle } from "@/app/[locale]/actions/search-ol";
import {
  addEditionToLibrary,
  type ReadingStatus,
  type EditionData,
} from "@/app/[locale]/actions/books";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

interface EditionResult {
  key: string;
  title: string;
  authors: string[];
  isbn10: string[];
  isbn13: string[];
  publishers: string[];
  publishDate: string | null;
  numberOfPages: number | null;
  covers: number[];
}

export function SearchEditionsTab() {
  const t = useTranslations("search");
  const tToast = useTranslations("toast");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EditionResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [isPending, startTransition] = useTransition();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setOffset(0);
    setHasMore(true);

    try {
      const editions = await searchEditionsByTitle(query, 20, 0);
      setResults(editions);
      setHasMore(editions.length === 20);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search editions");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    if (!query.trim() || isLoadingMore) return;

    setIsLoadingMore(true);
    const newOffset = offset + 20;

    try {
      const moreEditions = await searchEditionsByTitle(query, 20, newOffset);
      setResults([...results, ...moreEditions]);
      setOffset(newOffset);
      setHasMore(moreEditions.length === 20);
    } catch (error) {
      console.error("Load more error:", error);
      toast.error("Failed to load more results");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleAddToLibrary = (edition: EditionResult, status: ReadingStatus) => {
    startTransition(async () => {
      const coverUrl = edition.covers.length > 0
        ? `https://covers.openlibrary.org/b/id/${edition.covers[0]}-L.jpg`
        : null;

      const editionData: EditionData = {
        olEditionKey: edition.key,
        title: edition.title,
        authors: edition.authors,
        isbn10: edition.isbn10[0] || null,
        isbn13: edition.isbn13[0] || null,
        pages: edition.numberOfPages,
        publishDate: edition.publishDate,
        coverUrl,
      };

      const result = await addEditionToLibrary(editionData, status);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tToast("bookAdded", { title: edition.title }));
      }
    });
  };

  const getCoverUrl = (covers: number[]) => {
    if (covers.length === 0) return null;
    return `https://covers.openlibrary.org/b/id/${covers[0]}-L.jpg`;
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholderBooks")}
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={isSearching || !query.trim()}>
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t("searching")}
            </>
          ) : (
            t("searchButton")
          )}
        </Button>
      </form>

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results.map((edition) => {
              const coverUrl = getCoverUrl(edition.covers);

              return (
                <Card key={edition.key} className="flex flex-col">
                  <CardHeader className="p-0">
                    <div className="relative h-64">
                      {coverUrl ? (
                        <Image
                          src={coverUrl}
                          alt={edition.title}
                          fill
                          className="object-cover rounded-t-lg"
                        />
                      ) : (
                        <div className="w-full h-64 bg-muted rounded-t-lg flex items-center justify-center text-muted-foreground">
                          {t("noCover")}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pt-4">
                    <h3 className="font-semibold line-clamp-2">{edition.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {edition.authors.join(", ") || "Unknown Author"}
                    </p>
                    {edition.publishDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {edition.publishDate}
                      </p>
                    )}
                    {edition.numberOfPages && (
                      <p className="text-xs text-muted-foreground">
                        {edition.numberOfPages} pages
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <p className="text-xs font-medium w-full">
                      {t("addToLibrary")}
                    </p>
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddToLibrary(edition, "want")}
                        disabled={isPending}
                        className="flex-1"
                      >
                        {t("status.want")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddToLibrary(edition, "reading")}
                        disabled={isPending}
                        className="flex-1"
                      >
                        {t("status.reading")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddToLibrary(edition, "finished")}
                        disabled={isPending}
                        className="flex-1"
                      >
                        {t("status.finished")}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-6">
              <Button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                variant="outline"
                size="lg"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading more...
                  </>
                ) : (
                  `Load More Results`
                )}
              </Button>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            Showing {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
        </>
      )}

      {results.length === 0 && !isSearching && query && (
        <p className="text-center text-muted-foreground py-8">
          {t("noResults")}
        </p>
      )}
    </div>
  );
}
