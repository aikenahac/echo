import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";
import { getActivityPage } from "@/lib/feed";
import { userHref } from "@/lib/user-href";
import {
  getProfileView,
  getUserReviewsPage,
  type ProfileView,
} from "@/lib/visibility";
import { AdminBadge } from "@/components/echo/admin-badge";
import { AvatarTile, PlateNumber } from "@/components/echo/primitives";
import { Stamp } from "@/components/echo/stamp";
import { FeedList } from "@/components/feed/feed-list";
import { CollectionTile } from "@/components/library/collection-tile";
import { ModerationMenu } from "@/components/moderation/moderation-menu";
import { FollowCounts } from "@/components/profile/follow-counts";
import { Locked } from "@/components/profile/locked";
import { ReadingNowBand, Shelf } from "@/components/profile/shelf";
import {
  FollowButton,
  ProfileTabs,
  UserReviewList,
  type ProfileTab,
} from "@/components/profile/user-profile-controls";

type Props = {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const PAGE_SIZE = 20;

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  return { title: decodeURIComponent(username) };
}

export default async function UserProfilePage({ params, searchParams }: Props) {
  const [{ locale, username }, { tab: tabParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  // Cached per request (already loaded by the layout)
  const viewer = await getViewer();
  if (!viewer) {
    return redirect({ href: "/", locale });
  }

  const profile = await getProfileView(viewer.id, decodeURIComponent(username));
  if (!profile) {
    notFound();
  }
  if (profile.relationship.isSelf) {
    return redirect({ href: "/profile", locale });
  }

  const t = await getTranslations("userProfile");
  const { user, relationship } = profile;
  const name = user.displayName || user.username || "?";
  const tab: ProfileTab =
    tabParam === "reviews" || tabParam === "activity" ? tabParam : "books";

  return (
    <div className="pb-8">
      <div className="mx-auto w-full max-w-[1180px] px-5 pt-[max(12px,env(safe-area-inset-top))] md:px-10 md:pt-10">
        <div className="flex justify-end">
          <ModerationMenu userId={user.id} userName={name} />
        </div>
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end md:gap-16">
          <div>
            <div className="mt-4 flex items-center gap-4 md:mt-0">
              <AvatarTile name={name} src={user.profilePictureUrl} blurhash={user.profilePictureBlurhash} size={64} className="md:!size-24 md:!text-[44px]" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-disp truncate text-[28px] leading-[1.05] font-extrabold tracking-[-0.4px] md:text-[44px]">
                    {name}
                  </h1>
                  {user.isAdmin ? <AdminBadge size={22} className="md:[&_svg]:size-8" /> : null}
                </div>
                {user.username && (
                  <p className="truncate text-[17px] text-ink-2">@{user.username}</p>
                )}
              </div>
            </div>
            {user.bio && (
              <p className="mt-4 max-w-[52ch] text-[17px] leading-6 whitespace-pre-line">{user.bio}</p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <FollowButton userId={user.id} initial={relationship.isFollowing} />
              {relationship.isFriend ? (
                <Stamp size="sm">{t("friend")}</Stamp>
              ) : relationship.followsYou ? (
                <span className="text-[15px] text-ink-2">{t("followsYou")}</span>
              ) : null}
              <FollowCounts
                base={profile.access.content ? userHref(user) : null}
                followerCount={profile.followerCount}
                followingCount={profile.followingCount}
              />
            </div>
          </div>
          {profile.content && (
            <YearStat stats={profile.content.yearStats} />
          )}
        </div>
        <div className="mt-8 md:mt-10">
          <ProfileTabs value={tab} />
        </div>
      </div>

      {tab === "books" && <BooksTab profile={profile} name={name} />}

      {tab === "reviews" && (
        <div className="mx-auto w-full max-w-[760px] px-5 pt-4 md:px-10">
          {profile.access.reviews ? (
            <ReviewsTab userId={user.id} />
          ) : (
            <Locked audience={profile.visibility.reviews} name={name} />
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="mx-auto w-full max-w-[760px] px-5 pt-4 md:px-10">
          {profile.access.activity ? (
            <ActivityTab viewerId={viewer.id} userId={user.id} />
          ) : (
            <Locked audience={profile.visibility.activity} name={name} />
          )}
        </div>
      )}
    </div>
  );
}

async function YearStat({
  stats,
}: {
  stats: { booksFinishedThisYear: number; pagesReadThisYear: number };
}) {
  const t = await getTranslations("you");
  return (
    <div className="flex items-end gap-3.5">
      <PlateNumber
        value={stats.booksFinishedThisYear}
        className="text-[120px] md:text-[160px]"
      />
      <div className="pb-1">
        <p className="text-[17px] leading-[22px] font-semibold tracking-[-0.3px]">
          {t("booksFinishedIn", {
            count: stats.booksFinishedThisYear,
            year: new Date().getFullYear(),
          })}
        </p>
        <p className="text-[15px] text-ink-2 tnum">
          {t("pagesCount", { count: stats.pagesReadThisYear.toLocaleString() })}
        </p>
      </div>
    </div>
  );
}

async function BooksTab({ profile, name }: { profile: ProfileView; name: string }) {
  const t = await getTranslations("userProfile");
  const { content } = profile;

  if (!content) {
    return (
      <div className="mx-auto w-full max-w-[1180px] px-5 pt-4 md:px-10">
        <Locked audience={profile.visibility.content} name={name} />
      </div>
    );
  }

  const { shelves, publicCollections } = content;
  const base = userHref(profile.user);
  const empty =
    shelves.currentlyReading.length === 0 &&
    shelves.favorites.length === 0 &&
    shelves.wantToRead.length === 0 &&
    shelves.recentlyFinished.length === 0;

  return (
    <>
      <ReadingNowBand books={shelves.currentlyReading} className="mt-6 md:mt-8" />
      <div className="mx-auto w-full max-w-[1180px] px-5 md:px-10">
        {empty && publicCollections.length === 0 && (
          <p className="py-8 text-[15px] text-ink-2">{t("nothingYet", { name })}</p>
        )}
        <Shelf title={t("shelves.favourites")} books={shelves.favorites} href={`${base}/favourites`} seeAll={t("seeAll")} quiet />
        <Shelf title={t("shelves.want")} count={shelves.counts.want} books={shelves.wantToRead} href={`${base}/want`} seeAll={t("seeAll")} />
        <Shelf title={t("shelves.finished")} count={shelves.counts.finished} books={shelves.recentlyFinished} href={`${base}/finished`} seeAll={t("seeAll")} />

        {publicCollections.length > 0 && (
          <section className="pt-7 md:pt-10">
            <h2 className="font-disp text-[22px] font-extrabold tracking-[-0.2px] md:text-[28px]">
              {t("collections")}
            </h2>
            <ul className="mt-2">
              {publicCollections.map((c) => (
                <li key={c.id} className="[&+li]:hairline-t">
                  <Link href={`/library/collections/${c.id}`} className="flex items-center gap-3 py-3">
                    <CollectionTile colorTag={c.colorTag} iconName={c.iconName} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[17px] font-semibold tracking-[-0.3px]">{c.name}</span>
                      <span className="block text-[13px] text-ink-2 tnum">{t("books", { count: c.bookCount })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

async function ReviewsTab({ userId }: { userId: string }) {
  const page = await getUserReviewsPage(userId, 0, PAGE_SIZE);
  return (
    <UserReviewList userId={userId} initial={page.results} initialHasMore={page.hasMore} />
  );
}

async function ActivityTab({ viewerId, userId }: { viewerId: string; userId: string }) {
  const t = await getTranslations("userProfile");
  const page = await getActivityPage(viewerId, [userId], 0, PAGE_SIZE);
  if (page.activities.length === 0) {
    return <p className="py-8 text-[15px] text-ink-2">{t("noActivity")}</p>;
  }
  return (
    <FeedList
      initial={page.activities}
      initialHasMore={page.hasMore}
      userId={userId}
      // eslint-disable-next-line react-hooks/purity
      now={Date.now()}
    />
  );
}
