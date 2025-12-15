import { requireRole } from "@/lib/auth";
import { CatalogTabs } from "@/components/admin/catalog-tabs";

export const metadata = {
  title: "Catalog - Admin",
  description: "Browse OpenLibrary catalog data",
};

export default async function CatalogPage() {
  await requireRole(["admin", "moderator"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">OpenLibrary Catalog</h1>
        <p className="text-muted-foreground mt-2">
          Browse and search through imported OpenLibrary data
        </p>
      </div>

      <CatalogTabs />
    </div>
  );
}
