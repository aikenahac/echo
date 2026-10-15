import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listSupportTickets } from "@/app/[locale]/actions/support-admin";
import { SupportTicketList } from "@/components/admin/support-ticket-list";
import { supportStatusSchema } from "@/lib/support";

export default async function SupportAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  // The admin layout lets moderators in; tickets are admin-only
  if (!(await isAdmin())) redirect("/admin");

  const params = await searchParams;
  const status = supportStatusSchema.safeParse(params.status);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const result = await listSupportTickets({
    status: status.success ? status.data : undefined,
    page,
  }).catch(() => null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support</h1>
        <p className="text-muted-foreground">
          Requests sent from the public support page
        </p>
      </div>

      {result && !("error" in result) ? (
        <SupportTicketList
          initial={result}
          status={status.success ? status.data : undefined}
        />
      ) : (
        <div className="rounded-md border p-6 text-center text-destructive">
          Failed to load tickets. Reload the page to try again.
        </div>
      )}
    </div>
  );
}
