import { getTranslations } from "next-intl/server";
import { FollowListPage } from "@/components/profile/follow-list-page";

type Props = { params: Promise<{ locale: string; username: string }> };

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  const t = await getTranslations("userProfile.follows");
  return { title: `${t("followers")} · ${decodeURIComponent(username)}` };
}

export default async function UserFollowersPage({ params }: Props) {
  const { locale, username } = await params;
  return (
    <FollowListPage
      locale={locale}
      username={decodeURIComponent(username)}
      direction="followers"
    />
  );
}
