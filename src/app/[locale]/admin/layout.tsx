import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { countOpenSupportTickets } from "@/app/[locale]/actions/support-admin";
import { countOpenReports } from "@/app/[locale]/actions/reports-admin";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";

  if (!isAdmin && user?.role !== "moderator") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      <AdminNav
        isAdmin={isAdmin}
        openSupportCount={await countOpenSupportTickets()}
        openReportsCount={await countOpenReports()}
      />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
