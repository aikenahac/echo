import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getFeedPage } from "@/lib/feed";
import { IconButton } from "@/components/echo/buttons";
import { Icon } from "@/components/echo/icons";
import { ScreenTitle } from "@/components/echo/primitives";
import { Capsule } from "@/components/echo/buttons";
import { FeedList } from "@/components/feed/feed-list";

export async function generateMetadata() {
  const t = await getTranslations("friends");
  return { title: t("title") };
}

export default async function FeedPage() {
  const t = await getTranslations("friends");
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const page = await getFeedPage(userId, 0, 20);

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pt-[max(12px,env(safe-area-inset-top))] md:px-10 md:pt-10">
      <div className="flex h-[52px] items-center justify-between">
        <ScreenTitle>{t("title")}</ScreenTitle>
        <IconButton label={t("findReaders")} asChild>
          <Link href="/search?tab=readers">
            <Icon name="addPerson" />
          </Link>
        </IconButton>
      </div>
      <div className="mt-4">
        {page.activities.length === 0 ? (
          <div className="py-12">
            <p className="font-disp text-[28px] leading-none">{t("emptyTitle")}</p>
            <p className="mt-3 max-w-[40ch] text-[17px] leading-6 text-ink-2">{t("empty")}</p>
            <Capsule asChild className="mt-6">
              <Link href="/search?tab=readers">
                <Icon name="addPerson" size={20} />
                {t("findReaders")}
              </Link>
            </Capsule>
          </div>
        ) : (
          <FeedList
            initial={page.activities}
            initialHasMore={page.hasMore}
            // eslint-disable-next-line react-hooks/purity
            now={Date.now()}
          />
        )}
      </div>
    </div>
  );
}
