"use client";

import { BookCard } from "@/components/book-card";
import { useTranslations } from "next-intl";
import { Card } from "./ui/card";
import { useState } from "react";
import {
  Bookmark,
  BookOpen,
  CircleCheck,
  LayoutGrid,
  List,
  Menu,
  X,
  Heart,
  type LucideIcon,
} from "lucide-react";

import { useSearchParams } from "next/navigation";
import { ReadingStatus, UserBook } from "@/types";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";
import { useLibraryLayout } from "@/hooks/use-library-layout";
import { Button } from "./ui/button";
import {
  CollectionsList,
  type SidebarCollection,
} from "./collections/collections-list";
import { BookListItem } from "./book-list-item";
import type { LibraryLayout } from "@/lib/library-layout-cookie";

type LibraryTab = "favorites" | ReadingStatus;

const useFilter = (): {
  tab: string | null;
} => {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  return { tab };
};

interface LibraryTabsProps {
  favorites: UserBook[];
  wantToRead: UserBook[];
  currentlyReading: UserBook[];
  finished: UserBook[];
  collections: SidebarCollection[];
  hasCollectionAccess: boolean;
  initialLayout: LibraryLayout;
}

interface SidebarContentProps {
  setIsSidebarOpen: (open: boolean) => void;
  setLayout: (layout: LibraryLayout) => void;
  layout: LibraryLayout;
  tabs: Record<LibraryTab, { label: string; books: UserBook[]; icon: LucideIcon }>;
  activeTab: LibraryTab;
  collections: SidebarCollection[];
  hasCollectionAccess: boolean;
}

function SidebarContent({
  setIsSidebarOpen,
  setLayout,
  layout,
  tabs,
  activeTab,
  collections,
  hasCollectionAccess,
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
      <CollectionsList
        collections={collections}
        hasCollectionAccess={hasCollectionAccess}
      />
    </>
  );
}

export function LibraryIsland({
  favorites,
  wantToRead,
  currentlyReading,
  finished,
  collections,
  hasCollectionAccess,
  initialLayout,
}: LibraryTabsProps) {
  const t = useTranslations("library");
  const { tab } = useFilter();
  const { layout, setLayout } = useLibraryLayout(initialLayout);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const tabs: SidebarContentProps["tabs"] = {
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
      icon: CircleCheck,
    },
  };

  // Unknown or missing ?tab= values fall back to "reading"
  const activeTab: LibraryTab =
    tab && Object.hasOwn(tabs, tab) ? (tab as LibraryTab) : "reading";

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
          collections={collections}
          hasCollectionAccess={hasCollectionAccess}
        />
      </Card>

      {/* Main content */}
      <Card className="flex-1 h-full overflow-auto p-4">
        {layout === "grid" ? (
          <GridView books={tabs[activeTab].books} />
        ) : (
          <ListView books={tabs[activeTab].books} />
        )}
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
    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
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
        <BookListItem key={userBook.id} userBook={userBook} />
      ))}
    </div>
  );
};
