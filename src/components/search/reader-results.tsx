"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { followUser, unfollowUser } from "@/app/[locale]/actions/social";
import { Capsule } from "@/components/echo/buttons";
import { AvatarTile } from "@/components/echo/primitives";

export type Reader = {
  id: string;
  username: string | null;
  displayName: string | null;
  profilePictureUrl: string | null;
  profilePictureBlurhash: string | null;
  bio: string | null;
};

export function ReaderResults({
  query,
  readers,
  following: initialFollowing,
}: {
  query: string;
  readers: Reader[];
  following: string[];
}) {
  const t = useTranslations("find");
  const [following, setFollowing] = useState(() => new Set(initialFollowing));
  const [, startTransition] = useTransition();

  if (query.length < 2) {
    return <p className="mt-8 text-[15px] text-ink-2">{t("readersHint")}</p>;
  }
  if (readers.length === 0) {
    return <p className="mt-8 text-[15px] text-ink-2">{t("noReaders", { query })}</p>;
  }

  const toggle = (id: string) => {
    const on = following.has(id);
    setFollowing((prev) => {
      const next = new Set(prev);
      if (on) next.delete(id);
      else next.add(id);
      return next;
    });
    startTransition(async () => {
      const result = on ? await unfollowUser(id) : await followUser(id);
      if (result.error) {
        toast.error(result.error);
        setFollowing((prev) => {
          const next = new Set(prev);
          if (on) next.add(id);
          else next.delete(id);
          return next;
        });
      }
    });
  };

  return (
    <div className="mt-5">
      <p className="text-[13px] text-ink-2">{t("readersCount", { count: readers.length, query })}</p>
      <ul className="mt-1">
        {readers.map((r) => {
          const name = r.displayName || r.username || "?";
          const on = following.has(r.id);
          return (
            <li key={r.id} className="flex items-start gap-3 py-3.5 [&+li]:hairline-t">
              <AvatarTile name={name} src={r.profilePictureUrl} blurhash={r.profilePictureBlurhash} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-semibold tracking-[-0.4px]">{name}</p>
                {r.username && r.displayName && (
                  <p className="truncate text-[13px] text-ink-2">@{r.username}</p>
                )}
                {r.bio && <p className="mt-1 line-clamp-2 text-[15px] leading-5">{r.bio}</p>}
              </div>
              <Capsule
                size="xs"
                variant={on ? "outline" : "ink"}
                aria-pressed={on}
                className="mt-1 min-w-[88px]"
                onClick={() => toggle(r.id)}
              >
                {on ? t("following") : t("follow")}
              </Capsule>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
