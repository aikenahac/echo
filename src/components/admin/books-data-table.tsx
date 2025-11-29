"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  coverUrl: string | null;
  pages: number | null;
  publishedYear: number | null;
}

interface BookWithCount {
  book: Book;
  userCount: number;
}

interface BooksDataTableProps {
  data: BookWithCount[];
}

export function BooksDataTable({ data }: BooksDataTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height in pixels
    overscan: 5, // Render 5 extra rows above and below visible area
  });

  const items = virtualizer.getVirtualItems();

  // Define column widths for alignment
  const columnWidths = {
    cover: "80px",
    title: "300px",
    author: "200px",
    isbn: "180px",
    pages: "100px",
    year: "100px",
    users: "100px",
  };

  const totalWidth = Object.values(columnWidths).reduce((acc, width) => {
    return acc + parseInt(width);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${totalWidth}px` }}>
            <Table style={{ tableLayout: "fixed", width: `${totalWidth}px` }}>
              <TableHeader className="sticky top-0 bg-background z-10 border-b">
                <TableRow>
                  <TableHead style={{ width: columnWidths.cover }}>Cover</TableHead>
                  <TableHead style={{ width: columnWidths.title }}>Title</TableHead>
                  <TableHead style={{ width: columnWidths.author }}>Author</TableHead>
                  <TableHead style={{ width: columnWidths.isbn }}>ISBN</TableHead>
                  <TableHead style={{ width: columnWidths.pages }}>Pages</TableHead>
                  <TableHead style={{ width: columnWidths.year }}>Year</TableHead>
                  <TableHead style={{ width: columnWidths.users }} className="text-right">Users</TableHead>
                </TableRow>
              </TableHeader>
            </Table>

            {data.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No books found
              </div>
            ) : (
              <div
                ref={parentRef}
                className="overflow-y-auto overflow-x-hidden"
                style={{ height: "calc(100vh - 280px)" }} // Fixed height for virtualization
              >
                <Table style={{ tableLayout: "fixed", width: `${totalWidth}px` }}>
                  <TableBody
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      position: "relative",
                    }}
                  >
                    {items.map((virtualRow) => {
                      const { book, userCount } = data[virtualRow.index];
                      return (
                        <TableRow
                          key={book.id}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <TableCell style={{ width: columnWidths.cover }}>
                            {book.coverUrl ? (
                              <Image
                                src={book.coverUrl}
                                alt={book.title}
                                width={40}
                                height={60}
                                className="rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-15 bg-muted rounded flex items-center justify-center text-xs">
                                No cover
                              </div>
                            )}
                          </TableCell>
                          <TableCell style={{ width: columnWidths.title }} className="font-medium">
                            <p className="line-clamp-2">{book.title}</p>
                          </TableCell>
                          <TableCell style={{ width: columnWidths.author }}>{book.author}</TableCell>
                          <TableCell style={{ width: columnWidths.isbn }} className="font-mono text-sm">
                            {book.isbn || "—"}
                          </TableCell>
                          <TableCell style={{ width: columnWidths.pages }}>{book.pages || "—"}</TableCell>
                          <TableCell style={{ width: columnWidths.year }}>{book.publishedYear || "—"}</TableCell>
                          <TableCell style={{ width: columnWidths.users }} className="text-right">
                            <span className="font-semibold">{userCount}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Total books in catalog: {data.length}
      </div>
    </div>
  );
}
