"use client";

import { BookCard } from "@/components/book-card";
import { useTranslations } from "next-intl";
import { Card } from "./ui/card";
import { useMemo} from "react";
import { Bookmark, BookOpen, CheckCircle, LayoutGrid, List } from "lucide-react";

import { useSearchParams } from "next/navigation";
import { ReadingStatus, UserBook } from "@/types";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";
import { useLibraryLayout } from "@/hooks/use-library-layout";
import { Button } from "./ui/button";
import Image from "next/image";

const useFilter = (): {
  tab: ReadingStatus | null;
  collection: string | null;
} => {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") as ReadingStatus;
  const collection = searchParams.get("collection");

  return { tab, collection };
};

interface LibraryTabsProps {
  wantToRead: UserBook[];
  currentlyReading: UserBook[];
  finished: UserBook[];
}

export function LibraryIsland({
  wantToRead,
  currentlyReading,
  finished,
}: LibraryTabsProps) {
  const t = useTranslations("library");
  const { tab, collection } = useFilter();
  const { layout, setLayout, isLoaded } = useLibraryLayout();

  const tabs = useMemo(
    () => ({
      want: {
        label: t("tabs.want"),
        books: wantToRead,
        icon: Bookmark,
      },
      reading: {
        label: t("tabs.reading"),
        books: currentlyReading,
        icon: BookOpen,
      },
      finished: {
        label: t("tabs.finished"),
        books: finished,
        icon: CheckCircle,
      },
    }),
    [t, wantToRead, currentlyReading, finished],
  );

  const activeTab = tab ?? "reading";

  return (
    <Card className="w-full h-[80vh] flex flex-row gap-4 px-4">
      <div className="h-full rounded-md w-sm bg-card border border-gray-200 shadow flex flex-col gap-2 p-4">
        <div className="w-full flex flex-row items-center justify-end gap-1 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLayout("grid")}
            className={cn(
              "h-8 w-8",
              layout === "grid"
                ? "bg-primary/60 text-primary-foreground hover:bg-primary/80"
                : "hover:bg-primary/80"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLayout("list")}
            className={cn(
              "h-8 w-8",
              layout === "list"
                ? "bg-primary/60 text-primary-foreground hover:bg-primary/80"
                : "hover:bg-primary/80"
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        {Object.entries(tabs).map(([type, info]) => {
          const Icon = info.icon;
          return (
            <Link
              key={type}
              href={`?tab=${type}`}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "justify-start gap-2",
                activeTab === type
                  ? "bg-primary/60 text-accent-foreground"
                  : "hover:bg-primary/80"
              )}
            >
              <Icon className="h-4 w-4" />
              {info.label}
            </Link>
          );
        })}
      </div>
      <div className="w-full h-full overflow-auto">
        {isLoaded && (
          layout === "grid" ? (
            <GridView books={tabs[activeTab].books} />
          ) : (
            <ListView books={tabs[activeTab].books} />
          )
        )}
      </div>
    </Card>
  );
}

const GridView = ({ books }: { books: UserBook[] }) => {
  const t = useTranslations("library");
  if (books.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("empty.title")}</p>
        <p className="text-sm mt-2">{t("empty.description")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {books.map((userBook) => (
        <BookCard key={userBook.id} userBook={userBook} />
      ))}
    </div>
  );
};

const ListView = ({ books }: { books: UserBook[] }) => {
  const t = useTranslations("library");
  if (books.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("empty.title")}</p>
        <p className="text-sm mt-2">{t("empty.description")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {books.map((userBook) => (
        <Card key={userBook.id} className="flex flex-row gap-4 p-4">
          <Link href={`/books/${userBook.bookId}`} className="relative w-24 h-36 shrink-0">
            {userBook.book.coverUrl ? (
              <Image
                src={userBook.book.coverUrl}
                alt={userBook.book.title}
                fill
                className="object-cover rounded"
              />
            ) : (
              <div className="w-full h-full bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                No cover
              </div>
            )}
          </Link>
          <div className="flex-1 flex flex-col gap-2">
            <div>
              <Link href={`/books/${userBook.bookId}`}>
                <h3 className="font-semibold hover:underline">{userBook.book.title}</h3>
              </Link>
              <p className="text-sm text-muted-foreground">{userBook.book.author}</p>
            </div>
            {userBook.status === "reading" && userBook.book.pages && (
              <div className="text-sm text-muted-foreground">
                {userBook.currentPage || 0} / {userBook.book.pages} pages
              </div>
            )}
            {userBook.status === "finished" && userBook.rating && (
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <CheckCircle
                    key={i}
                    className={`h-3 w-3 ${
                      i < userBook.rating!
                        ? "fill-yellow-500 text-yellow-500"
                        : "fill-muted text-muted"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};