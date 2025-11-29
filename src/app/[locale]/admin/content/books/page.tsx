import { db } from "@/db";
import { books, userBooks } from "@/db/schema";
import { desc, count, eq } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";

export default async function BooksManagementPage() {
  // Get all books with user count
  const allBooks = await db
    .select({
      book: books,
      userCount: count(userBooks.id),
    })
    .from(books)
    .leftJoin(userBooks, eq(books.id, userBooks.bookId))
    .groupBy(books.id)
    .orderBy(desc(count(userBooks.id)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Book Management</h1>
        <p className="text-muted-foreground">
          View and manage the book catalog
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cover</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>Pages</TableHead>
              <TableHead>Year</TableHead>
              <TableHead className="text-right">Users</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allBooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No books found
                </TableCell>
              </TableRow>
            ) : (
              allBooks.map(({ book, userCount }) => (
                <TableRow key={book.id}>
                  <TableCell>
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
                  <TableCell className="font-medium max-w-xs">
                    <p className="line-clamp-2">{book.title}</p>
                  </TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {book.isbn || "—"}
                  </TableCell>
                  <TableCell>{book.pages || "—"}</TableCell>
                  <TableCell>{book.publishedYear || "—"}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold">{userCount}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Total books in catalog: {allBooks.length}
      </div>
    </div>
  );
}
