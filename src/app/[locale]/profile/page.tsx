import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";
import { getProfileShelves, getYearStats } from "@/lib/reading-stats";
import { Cover } from "@/components/echo/cover";
import { AvatarTile, PlateNumber } from "@/components/echo/primitives";
import {
  EditProfileLink,
  ProfileToolbar,
} from "@/components/profile/profile-toolbar";
import type { UserBook } from "@/types";

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

  const [stats, shelves] = await Promise.all([
    getYearStats(user.id),
    getProfileShelves(user.id),
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
                <h1 className="font-disp truncate text-[28px] leading-[1.05] font-extrabold tracking-[-0.4px] md:text-[44px]">
                  {name}
                </h1>
                {user.username && (
                  <p className="truncate text-[17px] text-ink-2">@{user.username}</p>
                )}
              </div>
            </div>
            <p className="mt-4 max-w-[52ch] text-[17px] leading-6">
              {user.bio || <EditProfileLink profile={profile}>{t("noBio")}</EditProfileLink>}
            </p>
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

      {shelves.currentlyReading.length > 0 && (
        <section className="on-field mt-8 bg-field md:mt-12">
          <div className="mx-auto w-full max-w-[1180px] px-5 pt-5 pb-6 md:px-10 md:py-8">
            <h2 className="text-[15px] font-semibold">{t("readingNow")}</h2>
            <ul className="mt-3.5 flex gap-3.5 overflow-x-auto pb-1 [scrollbar-width:none] md:gap-6">
              {shelves.currentlyReading.map((ub) => {
                const total = ub.pageCount || ub.book.pages;
                return (
                  <li key={ub.id} className="flex-none">
                    <Link href={`/books/${ub.book.id}`} className="block">
                      <Cover width={76} src={ub.book.coverUrl} title={ub.book.title} author={ub.book.author} className="md:!w-[110px]" />
                      <p className="mt-2 text-[13px] text-on-field-2 tnum">
                        {total ? t("pageOf", { page: ub.currentPage ?? 0, total }) : ub.book.title}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <div className="mx-auto w-full max-w-[1180px] px-5 md:px-10">
        <Shelf title={t("favourites")} books={shelves.favorites} href="/library?shelf=favourites" seeAll={t("seeAll")} quiet />
        <Shelf title={t("wantToRead")} count={shelves.counts.want} books={shelves.wantToRead} href="/library?shelf=want" seeAll={t("seeAll")} />
        <Shelf title={t("finished")} count={shelves.counts.finished} books={shelves.recentlyFinished} href="/library?shelf=finished" seeAll={t("seeAll")} />
      </div>
    </div>
  );
}

function Shelf({
  title,
  count,
  books,
  href,
  seeAll,
  quiet,
}: {
  title: string;
  count?: number;
  books: UserBook[];
  href: string;
  seeAll: string;
  quiet?: boolean;
}) {
  if (books.length === 0) return null;
  return (
    <section className="pt-7 md:pt-10">
      <div className="flex items-baseline justify-between">
        {quiet ? (
          <h2 className="text-[15px] font-semibold text-ink-2">{title}</h2>
        ) : (
          <h2 className="font-disp text-[22px] font-extrabold tracking-[-0.2px] md:text-[28px]">
            {title}
            {count !== undefined && <span className="tnum"> {count}</span>}
          </h2>
        )}
        <Link href={href} className="text-[15px] font-semibold text-pink-ink hover:underline">
          {seeAll}
        </Link>
      </div>
      <ul className="mt-3 flex gap-2.5 overflow-x-auto pb-3 [scrollbar-width:none] md:gap-5">
        {books.map((ub) => (
          <li key={ub.id} className="flex-none">
            <Link href={`/books/${ub.book.id}`} aria-label={ub.book.title}>
              <Cover width={58} src={ub.book.coverUrl} title={ub.book.title} author={ub.book.author} className="md:!w-[96px]" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
