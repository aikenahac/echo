import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";
import { getFollowList, type FollowDirection } from "@/lib/follow-lists";
import { userHref } from "@/lib/user-href";
import { getFollowCounts, getProfileAccess } from "@/lib/visibility";
import { Icon } from "@/components/echo/icons";
import { ScreenTitle } from "@/components/echo/primitives";
import { FollowList, FollowTabs } from "@/components/profile/follow-list";
import { Locked } from "@/components/profile/locked";

const PAGE_SIZE = 20;

/**
 * A reader's followers or following (`username` given) or the viewer's own
 * (`username` omitted). Other readers' lists are profile content: when that
 * is hidden from the viewer the counts stay and the list says why.
 */
export async function FollowListPage({
  locale,
  username,
  direction,
}: {
  locale: string;
  username?: string;
  direction: FollowDirection;
}) {
  // Cached per request (already loaded by the layout)
  const viewer = await getViewer();
  if (!viewer) {
    return redirect({ href: "/", locale });
  }

  const profile = await getProfileAccess(viewer.id, username ?? viewer.id);
  if (!profile) {
    notFound();
  }
  if (username && profile.relationship.isSelf) {
    return redirect({ href: `/profile/${direction}`, locale });
  }

  const t = await getTranslations("userProfile");
  const own = profile.relationship.isSelf;
  const { user } = profile;
  const name = user.displayName || user.username || "?";
  const base = own ? "/profile" : userHref(user);

  const [counts, page] = await Promise.all([
    getFollowCounts(user.id),
    profile.access.content
      ? getFollowList(user.id, direction, viewer.id, PAGE_SIZE, 0)
      : null,
  ]);

  const emptyKey =
    direction === "followers"
      ? own ? "followersSelf" : "followers"
      : own ? "followingSelf" : "following";

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pt-[max(12px,env(safe-area-inset-top))] pb-10 md:px-10 md:pt-10">
      <Link href={base} className="inline-flex items-center gap-1 text-[15px] font-semibold text-pink-ink hover:underline">
        <Icon name="back" size={16} />
        {t("back", { name })}
      </Link>
      <ScreenTitle className="mt-3 truncate">{name}</ScreenTitle>
      <div className="mt-6">
        <FollowTabs base={base} value={direction} {...counts} />
      </div>
      {page ? (
        <FollowList
          key={direction}
          targetId={user.id}
          direction={direction}
          initial={page.results}
          initialHasMore={page.hasMore}
          ownList={own}
          empty={t(`follows.empty.${emptyKey}`, { name })}
        />
      ) : (
        <Locked audience={profile.visibility.content} name={name} />
      )}
    </div>
  );
}
