import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { SendNotificationForm } from "@/components/admin/send-notification-form";

export default async function NotificationsAdminPage() {
  // The admin layout lets moderators in; sending notifications is admin-only
  if (!(await isAdmin())) redirect("/admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">
          Send a push notification to the mobile app. It goes out as an
          announcement, so people who turned announcements off won&apos;t get it.
        </p>
      </div>

      <SendNotificationForm />
    </div>
  );
}
