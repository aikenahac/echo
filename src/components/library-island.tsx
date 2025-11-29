"use client";

import { BookCard } from "@/components/book-card";
import { useTranslations } from "next-intl";
import { Card } from "./ui/card";
import { useMemo, useState } from "react";
import {
  Bookmark,
  BookOpen,
  CheckCircle,
  LayoutGrid,
  List,
  Menu,
  X,
  Heart,
} from "lucide-react";

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
  favorites: UserBook[];
  wantToRead: UserBook[];
  currentlyReading: UserBook[];
  finished: UserBook[];
}

interface SidebarContentProps {
  setIsSidebarOpen: (open: boolean) => void;
  setLayout: (layout: "grid" | "list") => void;
  layout: "grid" | "list";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tabs: Record<string, { label: string; books: UserBook[]; icon: any }>;
  activeTab: string;
}

function SidebarContent({
  setIsSidebarOpen,
  setLayout,
  layout,
  tabs,
  activeTab,
}: SidebarContentProps) {
  return (
    <>
      <div className="w-full flex flex-row items-center justify-between gap-1 mb-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLayout("grid")}
            className={cn(
              "h-8 w-8",
              layout === "grid"
                ? "bg-primary/60 text-primary-foreground hover:bg-primary/80"
                : "hover:bg-primary/80",
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
                : "hover:bg-primary/80",
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {Object.entries(tabs).map(([type, info]) => {
        const Icon = info.icon;
        return (
          <Link
            key={type}
            href={`?tab=${type}`}
            onClick={() => setIsSidebarOpen(false)}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "justify-start gap-2",
              activeTab === type
                ? "bg-primary/60 text-accent-foreground hover:bg-primary/80"
                : "hover:bg-primary/80",
            )}
          >
            <Icon className="h-4 w-4" />
            {info.label}
          </Link>
        );
      })}
    </>
  );
}

export function LibraryIsland({
  favorites,
  wantToRead,
  currentlyReading,
  finished,
}: LibraryTabsProps) {
  const t = useTranslations("library");
  const { tab, collection } = useFilter();
  const { layout, setLayout, isLoaded } = useLibraryLayout();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const tabs = useMemo(
    () => ({
      favorites: {
        label: t("tabs.favorites"),
        books: favorites,
        icon: Heart,
      },
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
    [t, favorites, wantToRead, currentlyReading, finished],
  );

  const activeTab = tab ?? "reading";

  return (
    <div className="w-full h-[80vh] flex flex-col md:flex-row gap-4">
      {/* Mobile menu button */}
      <div className="md:hidden flex items-center gap-2 pb-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsSidebarOpen(true)}
          className="h-10 w-10"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-lg font-semibold">
          {tabs[activeTab].label}
        </span>
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Card
        className={cn(
          "rounded-md bg-card border border-gray-200 shadow flex flex-col gap-2 p-4",
          "md:relative md:h-full md:w-64",
          "fixed top-0 left-0 h-full w-64 z-50 transition-transform duration-300",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <SidebarContent
          setIsSidebarOpen={setIsSidebarOpen}
          setLayout={setLayout}
          layout={layout}
          tabs={tabs}
          activeTab={activeTab}
        />
      </Card>

      {/* Main content */}
      <Card className="flex-1 h-full overflow-auto p-4">
        {isLoaded &&
          (layout === "grid" ? (
            <GridView books={tabs[activeTab].books} />
          ) : (
            <ListView books={tabs[activeTab].books} />
          ))}
      </Card>
    </div>
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
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
    <div className="flex flex-col gap-3 md:gap-4">
      {books.map((userBook) => (
        <Card key={userBook.id} className="flex flex-row gap-3 md:gap-4 p-3 md:p-4">
          <Link
            href={`/books/${userBook.bookId}`}
            className="relative w-16 h-24 sm:w-20 sm:h-30 md:w-24 md:h-36 shrink-0"
          >
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
          <div className="flex-1 flex flex-col gap-1 md:gap-2 min-w-0">
            <div>
              <Link href={`/books/${userBook.bookId}`}>
                <h3 className="font-semibold hover:underline text-sm md:text-base line-clamp-2">
                  {userBook.book.title}
                </h3>
              </Link>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                {userBook.book.author}
              </p>
            </div>
            {userBook.status === "reading" && userBook.book.pages && (
              <div className="text-xs md:text-sm text-muted-foreground">
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
