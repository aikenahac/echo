"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Search, Loader2, Database, Globe } from "lucide-react";
import {
  searchBooksHybrid,
  type SearchResult,
} from "@/app/[locale]/actions/search";
import {
  addBookToLibrary,
  type ReadingStatus,
} from "@/app/[locale]/actions/books";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
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

export function SearchBooks() {
  const t = useTranslations("search");
  const tToast = useTranslations("toast");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [searchSource, setSearchSource] = useState<
    "internal" | "external" | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setOffset(0);
    setHasMore(true);

    const books = await searchBooksHybrid(query, 0, 20);
    setResults(books);
    setSearchSource(books.length > 0 ? books[0].source : null);
    setHasMore(books.length === 20); // If we got 20 results, there might be more
    setIsSearching(false);
  };

  const handleLoadMore = async () => {
    if (!query.trim() || isLoadingMore) return;

    setIsLoadingMore(true);
    const newOffset = offset + 20;

    const moreBooks = await searchBooksHybrid(query, newOffset, 20);

    // Deduplicate by checking if book already exists in results
    const existingIds = new Set(results.map(r => r.id || r.key || `${r.isbn}-${r.title}`));
    const uniqueNewBooks = moreBooks.filter((book) => {
      const bookId = book.id || book.key || `${book.isbn}-${book.title}`;
      return !existingIds.has(bookId);
    });

    setResults([...results, ...uniqueNewBooks]);
    setOffset(newOffset);
    setHasMore(moreBooks.length === 20); // If we got 20 results, there might be more
    setIsLoadingMore(false);
  };

  const handleAddToLibrary = (book: SearchResult, status: ReadingStatus) => {
    startTransition(async () => {
      const bookData = {
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        pages: book.pages,
        publishedYear: book.publishedYear,
      };

      const result = await addBookToLibrary(bookData, status);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tToast("bookAdded", { title: book.title }));
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
            placeholder={t("placeholder")}
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

      {results.length > 0 && searchSource && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {searchSource === "internal" ? (
            <>
              <Database className="h-4 w-4" />
              <span>{t("source.internal")}</span>
            </>
          ) : (
            <>
              <Globe className="h-4 w-4" />
              <span>{t("source.external")}</span>
            </>
          )}
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results.map((book) => {
              const bookKey = book.id || book.key || `${book.isbn}-${book.title}`;

              return (
                <Card key={bookKey} className="flex flex-col">
                  <CardHeader className="p-0">
                    <div className="relative h-64">
                      {book.coverUrl ? (
                        <Image
                          src={book.coverUrl}
                          alt={book.title}
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
                    <h3 className="font-semibold line-clamp-2">{book.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {book.author}
                    </p>
                    {book.publishedYear && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {book.publishedYear}
                      </p>
                    )}
                    {book.source === "internal" && book.id && (
                      <Link
                        href={`/books/${book.id}`}
                        className="text-xs text-primary hover:underline mt-2 inline-block"
                      >
                        {t("viewDetails")}
                      </Link>
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
                        onClick={() => handleAddToLibrary(book, "want")}
                        disabled={isPending}
                        className="flex-1"
                      >
                        {t("status.want")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddToLibrary(book, "reading")}
                        disabled={isPending}
                        className="flex-1"
                      >
                        {t("status.reading")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddToLibrary(book, "finished")}
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
