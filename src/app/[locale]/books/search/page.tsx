import { SearchBooks } from "@/components/search-books";
import { getTranslations } from "next-intl/server";

export default async function BookSearchPage() {
  const t = await getTranslations("booksSearch");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>
      <SearchBooks />
    </div>
  );
}
