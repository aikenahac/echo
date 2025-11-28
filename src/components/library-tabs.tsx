"use client";

import { BookCard } from "@/components/book-card";
import type { userBooks, books } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

type UserBook = InferSelectModel<typeof userBooks> & {
  book: InferSelectModel<typeof books>;
};

interface LibraryTabsProps {
  wantToRead: UserBook[];
  currentlyReading: UserBook[];
  finished: UserBook[];
}

export function LibraryTabs({
  wantToRead,
  currentlyReading,
  finished,
}: LibraryTabsProps) {
  const t = useTranslations("library");

  const tabs = [
    { id: "want", label: t("tabs.want"), books: wantToRead },
    { id: "reading", label: t("tabs.reading"), books: currentlyReading },
    { id: "finished", label: t("tabs.finished"), books: finished },
  ];

  return (
    <Tabs defaultValue="reading" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label} ({tab.books.length})
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-6">
          {tab.books.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t("empty.title")}</p>
              <p className="text-sm mt-2">{t("empty.description")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {tab.books.map((userBook) => (
                <BookCard key={userBook.id} userBook={userBook} />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
