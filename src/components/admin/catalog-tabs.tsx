"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatalogTable } from "./catalog-table";
import { listAuthors, listWorks, listEditions } from "@/app/[locale]/actions/catalog";
import type { Author, Work, Edition } from "@/app/[locale]/actions/catalog";
import { Badge } from "@/components/ui/badge";

export function CatalogTabs() {
  return (
    <Tabs defaultValue="editions" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="editions">Editions</TabsTrigger>
        <TabsTrigger value="works">Works</TabsTrigger>
        <TabsTrigger value="authors">Authors</TabsTrigger>
      </TabsList>

      <TabsContent value="editions" className="space-y-4">
        <CatalogTable<Edition>
          fetchData={listEditions}
          searchPlaceholder="Search editions by title..."
          columns={[
            {
              key: "key",
              label: "OpenLibrary ID",
              render: (item) => (
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {item.key.split("/").pop()}
                </code>
              ),
            },
            {
              key: "title",
              label: "Title",
              render: (item) => (
                <div className="max-w-md">
                  <p className="font-medium truncate">{item.title}</p>
                </div>
              ),
            },
            {
              key: "isbn",
              label: "ISBN",
              render: (item) => (
                <div className="text-xs text-muted-foreground">
                  {item.isbn13?.[0] || item.isbn10?.[0] || "—"}
                </div>
              ),
            },
            {
              key: "publishers",
              label: "Publisher",
              render: (item) => (
                <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {item.publishers?.[0] || "—"}
                </div>
              ),
            },
            {
              key: "publishDate",
              label: "Published",
              render: (item) => (
                <div className="text-xs text-muted-foreground">
                  {item.publishDate || "—"}
                </div>
              ),
            },
            {
              key: "pages",
              label: "Pages",
              render: (item) => (
                <div className="text-xs text-muted-foreground">
                  {item.numberOfPages || "—"}
                </div>
              ),
            },
          ]}
        />
      </TabsContent>

      <TabsContent value="works" className="space-y-4">
        <CatalogTable<Work>
          fetchData={listWorks}
          searchPlaceholder="Search works by title..."
          columns={[
            {
              key: "key",
              label: "OpenLibrary ID",
              render: (item) => (
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {item.key.split("/").pop()}
                </code>
              ),
            },
            {
              key: "title",
              label: "Title",
              render: (item) => (
                <div className="max-w-md">
                  <p className="font-medium truncate">{item.title}</p>
                </div>
              ),
            },
            {
              key: "subjects",
              label: "Subjects",
              render: (item) => (
                <div className="flex flex-wrap gap-1 max-w-md">
                  {item.subjects?.slice(0, 3).map((subject, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {subject}
                    </Badge>
                  )) || "—"}
                </div>
              ),
            },
            {
              key: "firstPublishDate",
              label: "First Published",
              render: (item) => (
                <div className="text-xs text-muted-foreground">
                  {item.firstPublishDate || "—"}
                </div>
              ),
            },
          ]}
        />
      </TabsContent>

      <TabsContent value="authors" className="space-y-4">
        <CatalogTable<Author>
          fetchData={listAuthors}
          searchPlaceholder="Search authors by name..."
          columns={[
            {
              key: "key",
              label: "OpenLibrary ID",
              render: (item) => (
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {item.key.split("/").pop()}
                </code>
              ),
            },
            {
              key: "name",
              label: "Name",
              render: (item) => (
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.personalName && (
                    <p className="text-xs text-muted-foreground">
                      {item.personalName}
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: "dates",
              label: "Dates",
              render: (item) => (
                <div className="text-xs text-muted-foreground">
                  {item.birthDate && item.deathDate
                    ? `${item.birthDate} - ${item.deathDate}`
                    : item.birthDate
                    ? `b. ${item.birthDate}`
                    : item.deathDate
                    ? `d. ${item.deathDate}`
                    : "—"}
                </div>
              ),
            },
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}
