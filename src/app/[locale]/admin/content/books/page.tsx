import { db } from "@/db";
import { books, userBooks } from "@/db/schema";
import { desc, count, eq } from "drizzle-orm";
import { BooksDataTable } from "@/components/admin/books-data-table";

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

      <BooksDataTable data={allBooks} />
    </div>
  );
}
