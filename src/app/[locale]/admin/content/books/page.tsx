import { BooksDataTable } from "@/components/admin/books-data-table";
import { listBooksAdmin } from "@/app/[locale]/actions/admin";
import type { RawTableParams } from "@/lib/admin-table";

export default async function BooksManagementPage({
  searchParams,
}: {
  searchParams: Promise<RawTableParams>;
}) {
  const initial = await listBooksAdmin(await searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Book Management</h1>
        <p className="text-muted-foreground">
          View and manage the book catalog
        </p>
      </div>

      <BooksDataTable initial={initial} />
    </div>
  );
}
