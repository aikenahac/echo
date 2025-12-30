"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Search, Loader2, BookOpen, Hash } from "lucide-react";
import {
  searchBooks,
  type Work,
  type Edition,
  type SearchResponse,
} from "@/app/[locale]/actions/search-ol";
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
import { Badge } from "@/components/ui/badge";

export function SearchEditionsTab() {
  const t = useTranslations("search");
  const tToast = useTranslations("toast");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(Work | Edition)[]>([]);
  const [searchType, setSearchType] = useState<"works" | "editions">("works");
  const [total, setTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [isPending, startTransition] = useTransition();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const limit = 20;

  const performSearch = useCallback(async (searchQuery: string, searchOffset: number) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await searchBooks(searchQuery, limit, searchOffset);

      if (!response) {
        throw new Error("Search failed");
      }

      setResults(response.results as (Work | Edition)[]);
      setSearchType(response.type);
      setTotal(response.total);
      setOffset(searchOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
      toast.error("Failed to search books");
    } finally {
      setIsSearching(false);
    }
  }, [limit]);

  // Debounced search with useEffect
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!query.trim()) {
      setResults([]);
      setTotal(0);
      setError(null);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(query, 0);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    performSearch(query, 0);
  };

  const loadNextPage = () => {
    const newOffset = offset + limit;
    if (newOffset < total && !isSearching) {
      performSearch(query, newOffset);
    }
  };

  const loadPreviousPage = () => {
    const newOffset = Math.max(0, offset - limit);
    if (!isSearching) {
      performSearch(query, newOffset);
    }
  };

  // Type guards
  const isWork = (result: Work | Edition): result is Work => {
    return "authorNames" in result && "subjects" in result;
  };

  const isEdition = (result: Work | Edition): result is Edition => {
    return "isbn10" in result && "isbn13" in result;
  };

  // Helper to get cover URL
  const getCoverUrl = (
    coverIds: number[],
    size: "S" | "M" | "L" = "M"
  ): string | null => {
    if (!coverIds || coverIds.length === 0) return null;
    return `https://covers.openlibrary.org/b/id/${coverIds[0]}-${size}.jpg`;
  };

  const handleAddToLibrary = (result: Work | Edition, status: ReadingStatus) => {
    startTransition(async () => {
      const coverUrl = getCoverUrl(result.covers, "L");

      // For Works, we need to handle differently - for now, show a message
      // In the future, you might want to let users select a specific edition
      if (isWork(result)) {
        toast.info(
          `"${result.title}" is a work with ${result.editionCount} editions. Please search for a specific edition or ISBN to add to your library.`
        );
        return;
      }

      // Handle Edition
      const edition = result as Edition;
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

      const addResult = await addEditionToLibrary(editionData, status);

      if (addResult.error) {
        toast.error(addResult.error);
      } else {
        toast.success(tToast("bookAdded", { title: edition.title }));
      }
    });
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
            placeholder="Search for books, authors, or ISBN..."
            className="pl-10"
            autoFocus
          />
        </div>
        <Button type="submit" disabled={isSearching || !query.trim()}>
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Searching...
            </>
          ) : (
            "Search"
          )}
        </Button>
      </form>

      {/* Search type indicator */}
      {results.length > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            {searchType === "works" ? (
              <>
                <BookOpen className="h-3 w-3" />
                Searching Works
              </>
            ) : (
              <>
                <Hash className="h-3 w-3" />
                Searching Editions
              </>
            )}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}{" "}
            results
          </span>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results.map((result) => {
              const coverUrl = getCoverUrl(result.covers, "L");
              const work = isWork(result) ? result : null;
              const edition = isEdition(result) ? result : null;

              return (
                <Card key={result.key} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader className="p-0">
                    <div className="relative h-64">
                      {coverUrl ? (
                        <Image
                          src={coverUrl}
                          alt={result.title}
                          fill
                          className="object-cover rounded-t-lg"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-64 bg-muted rounded-t-lg flex items-center justify-center text-muted-foreground">
                          No Cover
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pt-4 space-y-2">
                    <h3 className="font-semibold line-clamp-2">{result.title}</h3>

                    {work && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {work.authorNames.join(", ") || "Unknown Author"}
                        </p>
                        {work.firstPublishDate && (
                          <p className="text-xs text-muted-foreground">
                            First published: {work.firstPublishDate}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {work.editionCount} {work.editionCount === 1 ? "edition" : "editions"}
                        </p>
                        {work.subjects.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {work.subjects.slice(0, 3).map((subject, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {edition && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {edition.authors.join(", ") || "Unknown Author"}
                        </p>
                        {edition.publishers.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {edition.publishers[0]}
                          </p>
                        )}
                        {edition.publishDate && (
                          <p className="text-xs text-muted-foreground">
                            {edition.publishDate}
                          </p>
                        )}
                        {edition.numberOfPages && (
                          <p className="text-xs text-muted-foreground">
                            {edition.numberOfPages} pages
                          </p>
                        )}
                        {(edition.isbn13.length > 0 || edition.isbn10.length > 0) && (
                          <p className="text-xs font-mono text-muted-foreground">
                            ISBN: {edition.isbn13[0] || edition.isbn10[0]}
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    {edition && (
                      <>
                        <p className="text-xs font-medium w-full">
                          Add to Library
                        </p>
                        <div className="flex gap-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddToLibrary(result, "want")}
                            disabled={isPending}
                            className="flex-1"
                          >
                            Want
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddToLibrary(result, "reading")}
                            disabled={isPending}
                            className="flex-1"
                          >
                            Reading
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddToLibrary(result, "finished")}
                            disabled={isPending}
                            className="flex-1"
                          >
                            Finished
                          </Button>
                        </div>
                      </>
                    )}
                    {work && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddToLibrary(result, "want")}
                        disabled={isPending}
                        className="w-full"
                      >
                        View Editions
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {total > limit && (
            <div className="flex justify-center items-center gap-4 pt-6">
              <Button
                onClick={loadPreviousPage}
                disabled={offset === 0 || isSearching}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {Math.floor(offset / limit) + 1} of{" "}
                {Math.ceil(total / limit)}
              </span>
              <Button
                onClick={loadNextPage}
                disabled={offset + limit >= total || isSearching}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Loading State */}
      {isSearching && results.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !isSearching && query.trim() && (
        <div className="text-center py-12 space-y-2">
          <p className="text-muted-foreground">
            No results found for &quot;{query}&quot;
          </p>
          <p className="text-sm text-muted-foreground">
            Try different keywords or check your spelling
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12 space-y-4">
          <p className="text-destructive">{error}</p>
          <Button
            onClick={() => performSearch(query, 0)}
            variant="outline"
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
