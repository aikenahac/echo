import { redirect } from "next/navigation";
import { isModerator } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasAccess = await isModerator();

  if (!hasAccess) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
