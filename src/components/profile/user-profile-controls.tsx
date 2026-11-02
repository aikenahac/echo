"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import {
  followUser,
  loadUserReviewsPage,
  unfollowUser,
} from "@/app/[locale]/actions/social";
import { Capsule } from "@/components/echo/buttons";
import { Cover } from "@/components/echo/cover";
import { Segmented } from "@/components/echo/segmented";
import type { UserReview } from "@/lib/visibility";

/** Follow / Following on a reader's profile; refreshes what they share. */
export function FollowButton({
  userId,
  initial,
}: {
  userId: string;
  initial: boolean;
}) {
  const t = useTranslations("userProfile");
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <Capsule
      size="sm"
      variant={on ? "outline" : "ink"}
      aria-pressed={on}
      disabled={pending}
      className="min-w-[112px]"
      onClick={() => {
        const next = !on;
        setOn(next);
        startTransition(async () => {
          const result = next ? await followUser(userId) : await unfollowUser(userId);
          if (result.error) {
            setOn(!next);
            toast.error(result.error);
            return;
          }
          // Following can unlock (or lock) followers- and friends-only parts
          router.refresh();
        });
      }}
    >
      {on ? t("following") : t("follow")}
    </Capsule>
  );
}

export type ProfileTab = "books" | "reviews" | "activity";

export function ProfileTabs({ value }: { value: ProfileTab }) {
  const t = useTranslations("userProfile");
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Segmented
      label={t("tabsLabel")}
      value={value}
      className="max-w-[420px]"
      options={(["books", "reviews", "activity"] as const).map((v) => ({
        value: v,
        label: t(`tabs.${v}`),
      }))}
      onChange={(next) =>
        router.replace(next === "books" ? pathname : `${pathname}?tab=${next}`, {
          scroll: false,
        })
      }
    />
  );
}

/** A reader's public reviews, newest first, with "Load more". */
export function UserReviewList({
  userId,
  initial,
  initialHasMore,
}: {
  userId: string;
  initial: UserReview[];
  initialHasMore: boolean;
}) {
  const t = useTranslations("userProfile");
  const format = useFormatter();
  const [items, setItems] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return <p className="py-8 text-[15px] text-ink-2">{t("noReviews")}</p>;
  }

  return (
    <>
      <ul>
        {items.map((r) => (
          <li key={r.id} className="flex gap-3.5 py-[18px] [&+li]:hairline-t">
            <Link href={`/books/${r.book.id}`} aria-label={r.book.title} className="flex-none self-start">
              <Cover width={56} src={r.book.coverUrl} title={r.book.title} author={r.book.author} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="flex text-[15px] leading-5">
                <Link href={`/books/${r.book.id}`} className="min-w-0 truncate">
                  <b className="font-semibold">{r.book.title}</b>
                  <span className="text-ink-2"> · {r.book.author}</span>
                </Link>
                <span className="ml-auto pl-2 text-[13px] whitespace-nowrap text-ink-2">
                  {format.dateTime(new Date(r.createdAt), { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </p>
              <p className="mt-1.5 text-[17px] leading-6 tracking-[-0.3px] whitespace-pre-line">
                {r.content}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="py-6 text-center">
          <Capsule
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const page = await loadUserReviewsPage(userId, items.length);
                setItems((prev) => {
                  const seen = new Set(prev.map((r) => r.id));
                  return [...prev, ...page.results.filter((r) => !seen.has(r.id))];
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
