import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getViewer } from "@/lib/auth";
import { getProfileShelves, getYearStats } from "@/lib/reading-stats";
import { getFollowCounts } from "@/lib/visibility";
import { AdminBadge } from "@/components/echo/admin-badge";
import { AvatarTile, PlateNumber } from "@/components/echo/primitives";
import {
  EditProfileLink,
  ProfileToolbar,
} from "@/components/profile/profile-toolbar";
import { FollowCounts } from "@/components/profile/follow-counts";
import { ReadingNowBand, Shelf } from "@/components/profile/shelf";

export async function generateMetadata() {
  const t = await getTranslations("you");
  return { title: t("title") };
}

export default async function ProfilePage() {
  const t = await getTranslations("you");
  // Cached per request (already loaded by the layout)
  const user = await getViewer();

  if (!user) {
    redirect("/");
  }

  const [stats, shelves, counts] = await Promise.all([
    getYearStats(user.id),
    getProfileShelves(user.id),
    getFollowCounts(user.id),
  ]);

  const name = user.displayName || user.username || "?";
  const profile = {
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    profilePictureUrl: user.profilePictureUrl,
    profilePictureBlurhash: user.profilePictureBlurhash,
  };

  return (
    <div className="pb-8">
      <div className="mx-auto w-full max-w-[1180px] px-5 pt-[max(12px,env(safe-area-inset-top))] md:px-10 md:pt-10">
        <div className="flex justify-end">
          <ProfileToolbar profile={profile} />
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
                  {user.role === "admin" ? <AdminBadge size={22} className="md:[&_svg]:size-8" /> : null}
                </div>
                {user.username && (
                  <p className="truncate text-[17px] text-ink-2">@{user.username}</p>
                )}
              </div>
            </div>
            <p className="mt-4 max-w-[52ch] text-[17px] leading-6">
              {user.bio || <EditProfileLink profile={profile}>{t("noBio")}</EditProfileLink>}
            </p>
            <FollowCounts base="/profile" className="mt-5" {...counts} />
          </div>
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
        </div>
      </div>

      <ReadingNowBand books={shelves.currentlyReading} className="mt-8 md:mt-12" />

      <div className="mx-auto w-full max-w-[1180px] px-5 md:px-10">
        <Shelf title={t("favourites")} books={shelves.favorites} href="/library?shelf=favourites" seeAll={t("seeAll")} quiet />
        <Shelf title={t("wantToRead")} count={shelves.counts.want} books={shelves.wantToRead} href="/library?shelf=want" seeAll={t("seeAll")} />
        <Shelf title={t("finished")} count={shelves.counts.finished} books={shelves.recentlyFinished} href="/library?shelf=finished" seeAll={t("seeAll")} />
      </div>
    </div>
  );
}

