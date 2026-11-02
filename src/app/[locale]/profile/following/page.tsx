import { getTranslations } from "next-intl/server";
import { FollowListPage } from "@/components/profile/follow-list-page";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata() {
  const t = await getTranslations("userProfile.follows");
  return { title: t("following") };
}

export default async function YourFollowingPage({ params }: Props) {
  const { locale } = await params;
  return <FollowListPage locale={locale} direction="following" />;
}
