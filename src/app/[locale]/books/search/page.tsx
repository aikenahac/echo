import { SearchBooks } from "@/components/search-books";

export default function BookSearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Search Books</h1>
      <SearchBooks />
    </div>
  );
}
