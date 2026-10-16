"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { loadFeedPage } from "@/app/[locale]/actions/social";
import { Cover } from "@/components/echo/cover";
import { AvatarTile, Stars } from "@/components/echo/primitives";
import { Stamp } from "@/components/echo/stamp";
import type { FeedActivity } from "@/lib/feed";
import { cn } from "@/lib/utils";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function useWhen(now: number) {
  const t = useTranslations("friends");
  const format = useFormatter();
  return (iso: string) => {
    const date = new Date(iso);
    const diff = now - date.getTime();
    if (diff < MINUTE) return t("now");
    if (diff < HOUR) return t("minutes", { count: Math.floor(diff / MINUTE) });
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    if (date.getTime() >= startOfToday.getTime()) return t("hours", { count: Math.floor(diff / HOUR) });
    if (date.getTime() >= startOfToday.getTime() - DAY) return t("yesterday");
    if (diff < 6 * DAY) return format.dateTime(date, { weekday: "short" });
    return format.dateTime(date, { day: "numeric", month: "short" });
  };
}

const key = (a: FeedActivity) => `${a.type}-${a.user.id}-${a.book.id}`;

/** The Friends feed with infinite scroll. */
export function FeedList({
  initial,
  initialHasMore,
  now,
}: {
  initial: FeedActivity[];
  initialHasMore: boolean;
  now: number;
}) {
  const t = useTranslations("friends");
  const [items, setItems] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const when = useWhen(now);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || loading) return;
        setLoading(true);
        loadFeedPage(items.length).then((page) => {
          setItems((prev) => {
            const seen = new Set(prev.map(key));
            return [...prev, ...page.activities.filter((a) => !seen.has(key(a)))];
          });
          setHasMore(page.hasMore);
          setLoading(false);
        });
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [items.length, hasMore, loading]);

  return (
    <>
      <ul>
        {items.map((a, i) => (
          <FeedItem key={key(a)} activity={a} when={when(a.date)} afterBand={i > 0 && isBand(items[i - 1])} />
        ))}
      </ul>
      <div ref={sentinel} aria-hidden className="h-px" />
      <p className="py-8 text-center text-[13px] text-ink-3" aria-live="polite">
        {loading ? t("loading") : !hasMore && items.length > 8 ? t("end") : null}
      </p>
    </>
  );
}

const isBand = (a: FeedActivity) => a.type === "book" && a.data.status === "reading";

function FeedItem({
  activity: a,
  when,
  afterBand,
}: {
  activity: FeedActivity;
  when: string;
  afterBand: boolean;
}) {
  const t = useTranslations("friends");
  const tShelf = useTranslations("shelf");
  const name = a.user.displayName || a.user.username || "?";
  const href = `/books/${a.book.id}`;

  const header = (
    <p className="flex text-[15px] leading-5">
      <span className="min-w-0">
        <b className="font-semibold">{name}</b>{" "}
        {a.type === "review"
          ? t("reviewed")
          : a.data.status === "finished"
            ? t("finished")
            : t("startedReading")}
      </span>
      <span className="ml-auto pl-2 text-[13px] whitespace-nowrap text-ink-2">{when}</span>
    </p>
  );

  if (isBand(a)) {
    // "started reading": the book has entered "now", so it sits on the field
    return (
      <li className="on-field -mx-5 flex gap-3 bg-field px-5 pt-[18px] pb-[22px] md:-mx-10 md:px-10">
        <AvatarTile name={name} src={a.user.profilePictureUrl} blurhash={a.user.profilePictureBlurhash} className="bg-[rgba(255,235,243,.6)] dark:bg-white/10" />
        <div className="min-w-0 flex-1">
          {header}
          <Link href={href} className="mt-2.5 flex items-end gap-3">
            <Cover width={92} src={a.book.coverUrl} title={a.book.title} author={a.book.author} />
            <span className="min-w-0 pb-0.5">
              <span className="font-disp plate-sm block text-[28px] leading-[1.05] tracking-[-0.3px] md:text-[34px]">
                {a.book.title}
              </span>
              <span className="mt-1 block text-[13px] text-ink-2">
                {a.book.author}
                {a.book.pages ? ` · ${t("pages", { count: a.book.pages })}` : ""}
              </span>
            </span>
          </Link>
        </div>
      </li>
    );
  }

  return (
    <li className={cn("flex gap-3 py-[18px]", !afterBand && "[&:not(:first-child)]:hairline-t")}>
      <AvatarTile name={name} src={a.user.profilePictureUrl} blurhash={a.user.profilePictureBlurhash} />
      <div className="min-w-0 flex-1">
        {header}
        {a.type === "review" ? (
          <>
            <p className="mt-2 line-clamp-3 text-[17px] leading-6 tracking-[-0.3px]">{a.data.content}</p>
            <Link href={href} className="mt-3.5 flex items-center gap-2">
              <Cover width={24} src={a.book.coverUrl} title={a.book.title} />
              <span className="truncate text-[15px]">
                <b className="font-semibold">{a.book.title}</b>
                <span className="text-ink-2"> · {a.book.author}</span>
              </span>
            </Link>
          </>
        ) : (
          <Link href={href} className="mt-2.5 flex items-end gap-3">
            <span className="relative">
              <Cover width={56} src={a.book.coverUrl} title={a.book.title} author={a.book.author} />
              <span className="absolute inset-x-0 bottom-1.5 flex justify-center">
                <Stamp size="xs">{tShelf("finished")}</Stamp>
              </span>
            </span>
            <span className="min-w-0 pb-0.5">
              <span className="font-disp block text-[22px] leading-[1.05] font-extrabold tracking-[-0.3px]">
                {a.book.title}
              </span>
              <span className="block text-[15px] text-ink-2">{a.book.author}</span>
              {a.data.rating ? <Stars value={a.data.rating} className="mt-1" /> : null}
            </span>
          </Link>
        )}
      </div>
    </li>
  );
}
