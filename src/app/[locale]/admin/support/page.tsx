import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listSupportTickets } from "@/app/[locale]/actions/support-admin";
import { SupportTicketList } from "@/components/admin/support-ticket-list";
import type { RawTableParams } from "@/lib/admin-table";

export default async function SupportAdminPage({
  searchParams,
}: {
  searchParams: Promise<RawTableParams>;
}) {
  // The admin layout lets moderators in; tickets are admin-only
  if (!(await isAdmin())) redirect("/admin");

  const result = await listSupportTickets(await searchParams).catch(() => null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support</h1>
        <p className="text-muted-foreground">
          Requests sent from the public support page
        </p>
      </div>

      {result ? (
        <SupportTicketList initial={result} />
      ) : (
        <div className="rounded-md border p-6 text-center text-destructive">
          Failed to load tickets. Reload the page to try again.
        </div>
      )}
    </div>
  );
}
