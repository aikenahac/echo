import { requireRole } from "@/lib/auth";
import { ImportControls } from "@/components/admin/import-controls";
import { ElasticsearchReindex } from "@/components/admin/elasticsearch-reindex";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "Alexandria - Admin",
  description: "Manage OpenLibrary data imports and Elasticsearch indexing",
};

export default async function DataImportPage() {
  await requireRole(["admin"]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Alexandria</h1>
        <p className="text-muted-foreground mt-2">
          Manage OpenLibrary data imports and Elasticsearch search indexing
        </p>
      </div>

      {/* Data Import Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Data Import</h2>
          <p className="text-muted-foreground text-sm">
            Trigger manual imports from OpenLibrary data dumps. The system also automatically refreshes data on the 5th of each month.
          </p>
        </div>
        <ImportControls />
      </div>

      <Separator />

      {/* Elasticsearch Reindex Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Search Index</h2>
          <p className="text-muted-foreground text-sm">
            Re-index data into Elasticsearch to apply search improvements and quality enhancements
          </p>
        </div>
        <ElasticsearchReindex />
      </div>
    </div>
  );
}
