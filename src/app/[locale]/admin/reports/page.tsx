import { ReportsDataTable } from "@/components/admin/reports-data-table";
import { listReportsAdmin } from "@/app/[locale]/actions/reports-admin";
import type { RawTableParams } from "@/lib/admin-table";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<RawTableParams>;
}) {
  const initial = await listReportsAdmin(await searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">
          Users and reviews reported by readers
        </p>
      </div>

      <ReportsDataTable initial={initial} />
    </div>
  );
}
