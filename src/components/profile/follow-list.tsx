"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/routing";
import {
  followUser,
  loadFollowListPage,
  unfollowUser,
} from "@/app/[locale]/actions/social";
import { AdminBadge } from "@/components/echo/admin-badge";
import { Capsule } from "@/components/echo/buttons";
import { AvatarTile } from "@/components/echo/primitives";
import { Segmented } from "@/components/echo/segmented";
import { Stamp } from "@/components/echo/stamp";
import type { FollowDirection, FollowListUser } from "@/lib/follow-lists";
import { userHref } from "@/lib/user-href";

/** Followers (n) | Following (n), each its own URL under `base` */
export function FollowTabs({
  base,
  value,
  followerCount,
  followingCount,
}: {
  base: string;
  value: FollowDirection;
  followerCount: number;
  followingCount: number;
}) {
  const t = useTranslations("userProfile.follows");
  const router = useRouter();
  return (
    <Segmented
      label={t("label")}
      value={value}
      className="max-w-[420px]"
      options={[
        { value: "followers", label: t("followersTab", { count: followerCount }) },
        { value: "following", label: t("followingTab", { count: followingCount }) },
      ]}
      onChange={(next) => router.replace(`${base}/${next}`, { scroll: false })}
    />
  );
}

/**
 * A page of followers or following, each marked Friend or Follows you, with
 * Follow / Follow back / Following and "Load more".
 */
export function FollowList({
  targetId,
  direction,
  initial,
  initialHasMore,
  ownList,
  empty,
}: {
  targetId: string;
  direction: FollowDirection;
  initial: FollowListUser[];
  initialHasMore: boolean;
  /** The viewer's own lists: following someone changes the counts above */
  ownList: boolean;
  empty: string;
}) {
  const t = useTranslations("userProfile");
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, startLoading] = useTransition();
  const [, startToggle] = useTransition();

  if (items.length === 0) {
    return <p className="py-8 text-[15px] text-ink-2">{empty}</p>;
  }

  const setFollowing = (id: string, isFollowing: boolean) =>
    setItems((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, isFollowing, isFriend: isFollowing && u.followsYou }
          : u,
      ),
    );

  const toggle = (user: FollowListUser) => {
    const next = !user.isFollowing;
    setFollowing(user.id, next);
    startToggle(async () => {
      const result = next ? await followUser(user.id) : await unfollowUser(user.id);
      if (result.error) {
        setFollowing(user.id, !next);
        toast.error(result.error);
        return;
      }
      if (ownList) router.refresh();
    });
  };

  return (
    <>
      <ul className="mt-2">
        {items.map((u) => {
          const name = u.displayName || u.username || "?";
          const href = u.isSelf ? "/profile" : userHref(u);
          return (
            <li key={u.id} className="flex items-center gap-3 py-3 [&+li]:hairline-t">
              <Link href={href} aria-label={name} className="flex-none">
                <AvatarTile name={name} src={u.profilePictureUrl} blurhash={u.profilePictureBlurhash} size={44} />
              </Link>
              <Link href={href} className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-[17px] font-semibold tracking-[-0.4px]">
                  <span className="truncate">{name}</span>
                  {u.isAdmin && <AdminBadge size={14} />}
                </p>
                <p className="flex items-center gap-2 text-[13px] text-ink-2">
                  {u.username && u.displayName && (
                    <span className="truncate">@{u.username}</span>
                  )}
                  {u.isFriend ? (
                    <Stamp size="xs" rotate={-4} className="flex-none">{t("friend")}</Stamp>
                  ) : u.followsYou ? (
                    <span className="flex-none">{t("followsYou")}</span>
                  ) : null}
                </p>
              </Link>
              {!u.isSelf && (
                <Capsule
                  size="xs"
                  variant={u.isFollowing ? "outline" : "ink"}
                  aria-pressed={u.isFollowing}
                  className="min-w-[96px]"
                  onClick={() => toggle(u)}
                >
                  {u.isFollowing
                    ? t("following")
                    : u.followsYou
                      ? t("follows.followBack")
                      : t("follow")}
                </Capsule>
              )}
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <div className="py-6 text-center">
          <Capsule
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() =>
              startLoading(async () => {
                const page = await loadFollowListPage(targetId, direction, items.length);
                setItems((prev) => {
                  const seen = new Set(prev.map((u) => u.id));
                  return [...prev, ...page.results.filter((u) => !seen.has(u.id))];
                });
                setHasMore(page.hasMore);
              })
            }
          >
            {t("loadMore")}
          </Capsule>
        </div>
      )}
    </>
  );
}
