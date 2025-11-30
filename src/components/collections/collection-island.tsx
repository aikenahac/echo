"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { BookCard } from "@/components/book-card";
import { BookListItem } from "@/components/book-list-item";
import { CollectionsList } from "./collections-list";
import { useLibraryLayout } from "@/hooks/use-library-layout";
import { cn } from "@/lib/utils";
import { ReadingStatus, UserBook } from "@/types";
import { getColorClass } from "@/lib/colors";

interface Collection {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  isPublic: boolean;
  colorTag?: string | null;
  iconName?: string | null;
  coverImageUrl?: string | null;
  bookCount: number;
  books: Array<{
    id: string;
    userBook: UserBook;
  }>;
}

interface CollectionIslandProps {
  collection: Collection;
  isOwner: boolean;
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
  tabs: Record<string, { label: string; books: UserBook[]; icon: any; href: string }>;
  activeView: "collection" | ReadingStatus;
}

function SidebarContent({
  setIsSidebarOpen,
  setLayout,
  layout,
  tabs,
  activeView,
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
            href={info.href}
            onClick={() => setIsSidebarOpen(false)}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "justify-start gap-2",
              activeView === type
                ? "bg-primary/60 text-accent-foreground hover:bg-primary/80"
                : "hover:bg-primary/80",
            )}
          >
            <Icon className="h-4 w-4" />
            {info.label}
          </Link>
        );
      })}
      <CollectionsList />
    </>
  );
}

export function CollectionIsland({
  collection,
  isOwner,
  favorites,
  wantToRead,
  currentlyReading,
  finished,
}: CollectionIslandProps) {
  const t = useTranslations("library");
  const { layout, setLayout, isLoaded } = useLibraryLayout();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const tabs = useMemo(
    () => ({
      favorites: {
        label: t("tabs.favorites"),
        books: favorites,
        icon: Heart,
        href: "/library?tab=favorites",
      },
      want: {
        label: t("tabs.want"),
        books: wantToRead,
        icon: Bookmark,
        href: "/library?tab=want",
      },
      reading: {
        label: t("tabs.reading"),
        books: currentlyReading,
        icon: BookOpen,
        href: "/library?tab=reading",
      },
      finished: {
        label: t("tabs.finished"),
        books: finished,
        icon: CheckCircle,
        href: "/library?tab=finished",
      },
    }),
    [t, favorites, wantToRead, currentlyReading, finished],
  );

  const collectionBooks = collection.books.map((cb) => cb.userBook);

  // Get the border color class
  const borderColorClass = collection.colorTag
    ? getColorClass(collection.colorTag, "border")
    : "border-blue-500";

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
        <span className="text-lg font-semibold">{collection.name}</span>
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
          activeView="collection"
        />
      </Card>

      {/* Main content */}
      <Card className={cn("flex-1 h-full overflow-auto p-4 border-4", borderColorClass)}>
        {/* Collection header */}
        <div className="mb-6">
          {collection.coverImageUrl && (
            <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden">
              <Image
                src={collection.coverImageUrl}
                alt={collection.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">{collection.name}</h2>
              {collection.description && (
                <p className="text-muted-foreground mb-2">{collection.description}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {collection.bookCount} {collection.bookCount === 1 ? "book" : "books"}
              </p>
            </div>
            {isOwner && (
              <div className="flex gap-2">
                {/* TODO: Add edit and share buttons */}
              </div>
            )}
          </div>
        </div>

        {/* Books grid/list */}
        {isLoaded && (
          <>
            {collectionBooks.length > 0 ? (
              layout === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                  {collectionBooks.map((userBook) => (
                    <BookCard key={userBook.id} userBook={userBook} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3 md:gap-4">
                  {collectionBooks.map((userBook) => (
                    <BookListItem key={userBook.id} userBook={userBook} />
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-semibold mb-2">No books in this collection yet</p>
                {isOwner && (
                  <p className="text-sm">Add books from your library to get started</p>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
