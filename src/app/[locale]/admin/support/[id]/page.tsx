import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { getSupportTicket } from "@/app/[locale]/actions/support-admin";
import { SupportTicketDetail } from "@/components/admin/support-ticket-detail";

const formatStamp = (date: Date) => format(date, "d MMM yyyy, HH:mm");

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin");

  const { id } = await params;
  const ticket = await getSupportTicket(id);
  if (!ticket) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/support"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All tickets
      </Link>
      <h1 className="text-3xl font-bold">Support ticket</h1>
      <SupportTicketDetail
        id={ticket.id}
        name={ticket.name}
        email={ticket.email}
        message={ticket.message}
        initialStatus={ticket.status}
        initialNote={ticket.internalNote ?? ""}
        createdLabel={formatStamp(ticket.createdAt)}
        updatedLabel={formatStamp(ticket.updatedAt)}
        resolvedLabel={ticket.resolvedAt ? formatStamp(ticket.resolvedAt) : null}
      />
    </div>
  );
}
