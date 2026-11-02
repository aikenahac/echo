import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";
import { userHref } from "@/lib/user-href";
import {
  getProfileAccess,
  getUserShelfPage,
  isProfileShelf,
} from "@/lib/visibility";
import { Capsule } from "@/components/echo/buttons";
import { Cover } from "@/components/echo/cover";
import { Icon } from "@/components/echo/icons";
import { ScreenTitle } from "@/components/echo/primitives";

type Props = {
  params: Promise<{ locale: string; username: string; shelf: string }>;
  searchParams: Promise<{ page?: string }>;
};

const PAGE_SIZE = 48;

/** One of a reader's shelves in full, a page of covers at a time. */
export default async function UserShelfPage({ params, searchParams }: Props) {
  const [{ locale, username, shelf }, { page: pageParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!isProfileShelf(shelf)) {
    notFound();
  }

  const viewer = await getViewer();
  if (!viewer) {
    return redirect({ href: "/", locale });
  }

  const profile = await getProfileAccess(viewer.id, decodeURIComponent(username));
  if (!profile) {
    notFound();
  }
  if (profile.relationship.isSelf) {
    return redirect({ href: `/library?shelf=${shelf}`, locale });
  }

  const base = userHref(profile.user);
  // Profile content is hidden from this viewer: the profile says why
  if (!profile.access.content) {
    return redirect({ href: base, locale });
  }

  const t = await getTranslations("userProfile");
  const page = Math.min(200, Math.max(1, Math.trunc(Number(pageParam)) || 1));
  const { results, hasMore } = await getUserShelfPage(
    profile.user.id,
    shelf,
    (page - 1) * PAGE_SIZE,
    PAGE_SIZE,
  );
  const name = profile.user.displayName || profile.user.username || "?";

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 pt-[max(12px,env(safe-area-inset-top))] pb-10 md:px-10 md:pt-10">
      <Link href={base} className="inline-flex items-center gap-1 text-[15px] font-semibold text-pink-ink hover:underline">
        <Icon name="back" size={16} />
        {t("back", { name })}
      </Link>
      <ScreenTitle className="mt-3">{t(`shelves.${shelf}`)}</ScreenTitle>

      {results.length === 0 ? (
        <p className="py-8 text-[15px] text-ink-2">{t("emptyShelf")}</p>
      ) : (
        <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-x-4 gap-y-6 md:grid-cols-[repeat(auto-fill,minmax(128px,1fr))] md:gap-x-6">
          {results.map((ub) => (
            <li key={ub.id}>
              <Link href={`/books/${ub.book.id}`} className="block">
                <Cover width={128} src={ub.book.coverUrl} title={ub.book.title} author={ub.book.author} className="!w-full" />
                <p className="mt-2 line-clamp-2 text-[13px] leading-[17px] font-semibold">{ub.book.title}</p>
                <p className="truncate text-[13px] text-ink-2">{ub.book.author}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasMore) && (
        <nav className="mt-10 flex justify-between">
          {page > 1 ? (
            <Capsule asChild size="sm" variant="outline">
              <Link href={`${base}/${shelf}?page=${page - 1}`}>{t("previous")}</Link>
            </Capsule>
          ) : (
            <span />
          )}
          {hasMore && (
            <Capsule asChild size="sm" variant="outline">
              <Link href={`${base}/${shelf}?page=${page + 1}`}>{t("next")}</Link>
            </Capsule>
          )}
        </nav>
      )}
    </div>
  );
}
