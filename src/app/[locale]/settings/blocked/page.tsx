import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";
import { listBlockedUsers } from "@/app/[locale]/actions/blocks";
import { ScreenTitle } from "@/components/echo/primitives";
import { BlockedUsersList } from "@/components/moderation/blocked-users-list";

export async function generateMetadata() {
  const t = await getTranslations("moderation");
  return { title: t("blockedTitle") };
}

export default async function BlockedUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const user = await getViewer();
  if (!user) {
    return redirect({ href: "/", locale });
  }

  const [t, blocked] = await Promise.all([
    getTranslations("moderation"),
    listBlockedUsers(user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pt-[max(12px,env(safe-area-inset-top))] pb-12 md:px-10 md:pt-10">
      <div className="flex h-[52px] items-center">
        <ScreenTitle>{t("blockedTitle")}</ScreenTitle>
      </div>
      <p className="text-[15px] text-ink-2">{t("blockedBody")}</p>
      <BlockedUsersList initial={blocked.users} />
    </div>
  );
}
