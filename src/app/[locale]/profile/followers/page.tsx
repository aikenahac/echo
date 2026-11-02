import { getTranslations } from "next-intl/server";
import { FollowListPage } from "@/components/profile/follow-list-page";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata() {
  const t = await getTranslations("userProfile.follows");
  return { title: t("followers") };
}

export default async function YourFollowersPage({ params }: Props) {
  const { locale } = await params;
  return <FollowListPage locale={locale} direction="followers" />;
}
