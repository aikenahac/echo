"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchEditionsTab } from "./search-editions-tab";

export function SearchBooks() {
  const t = useTranslations("search");
  const [activeTab, setActiveTab] = useState<"books">("books");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "books")}>
        <TabsList className="grid w-full grid-cols-1 max-w-md">
          <TabsTrigger value="books">{t("tabs.books")}</TabsTrigger>
          {/* Additional tabs can be added here in the future */}
        </TabsList>

        <TabsContent value="books" className="mt-6">
          <SearchEditionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
