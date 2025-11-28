"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Search, Loader2, Database, Globe } from "lucide-react";
import { searchBooksHybrid, type SearchResult } from "@/app/[locale]/actions/search";
import { addBookToLibrary, type ReadingStatus } from "@/app/[locale]/actions/books";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SearchBooks() {
  const t = useTranslations("search");
  const tToast = useTranslations("toast");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSource, setSearchSource] = useState<"internal" | "external" | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    const books = await searchBooksHybrid(query);
    setResults(books);
    setSearchSource(books.length > 0 ? books[0].source : null);
    setIsSearching(false);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {results.map((book) => {
            const bookKey = book.id || book.key || `${book.isbn}-${book.title}`;

            return (
              <Card key={bookKey} className="flex flex-col">
                <CardHeader className="p-0">
                  {book.source === "internal" && book.id ? (
                    <Link href={`/books/${book.id}`} className="block relative h-64">
                      {book.coverUrl ? (
                        <Image
                          src={book.coverUrl}
                          alt={book.title}
                          fill
                          className="object-cover rounded-t-lg hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-64 bg-muted rounded-t-lg flex items-center justify-center text-muted-foreground hover:opacity-90 transition-opacity">
                          {t("noCover")}
                        </div>
                      )}
                    </Link>
                  ) : (
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
                  )}
                </CardHeader>
                <CardContent className="flex-1 pt-4">
                  {book.source === "internal" && book.id ? (
                    <Link href={`/books/${book.id}`}>
                      <h3 className="font-semibold line-clamp-2 hover:underline">
                        {book.title}
                      </h3>
                    </Link>
                  ) : (
                    <h3 className="font-semibold line-clamp-2">{book.title}</h3>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">{book.author}</p>
                  {book.publishedYear && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {book.publishedYear}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  {book.source === "internal" && book.id ? (
                    <Button asChild className="w-full">
                      <Link href={`/books/${book.id}`}>{t("viewDetails")}</Link>
                    </Button>
                  ) : (
                    <>
                      <p className="text-xs font-medium w-full">{t("addToLibrary")}</p>
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
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {results.length === 0 && !isSearching && query && (
        <p className="text-center text-muted-foreground py-8">{t("noResults")}</p>
      )}
    </div>
  );
}
