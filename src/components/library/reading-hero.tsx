"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/routing";
import {
  rateBook,
  reopenBook,
  updateBookCurrentPage,
  updateBookPageCount,
} from "@/app/[locale]/actions/books";
import { Capsule } from "@/components/echo/buttons";
import { Cover } from "@/components/echo/cover";
import { Icon } from "@/components/echo/icons";
import { Stamp } from "@/components/echo/stamp";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { UserBook } from "@/types";
import { PageCounter } from "./page-counter";

const SAVE_DELAY = 600;
const UNDO_WINDOW = 5000;

/**
 * The book you are reading, on the pink field: cover, the page number as a
 * numbering stamp, and −/Next page. Reaching the last page lands the FINISHED
 * stamp, drains the field to paper and offers a rating, with Undo for 5s.
 */
export function ReadingHero({
  userBook,
  children,
  header,
}: {
  userBook: UserBook;
  /** Rendered under the hero, inside the field (nothing for now). */
  children?: React.ReactNode;
  /** Title row and shelf tabs, drawn on the same field. */
  header: React.ReactNode;
}) {
  const t = useTranslations("shelf");
  const router = useRouter();
  const { book } = userBook;
  const [total, setTotal] = useState<number | null>(
    userBook.pageCount || book.pages || null,
  );
  const [page, setPage] = useState(userBook.currentPage ?? 0);
  const [editing, setEditing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const saved = useRef(userBook.currentPage ?? 0);
  const beforeFinish = useRef(userBook.currentPage ?? 0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  const persist = (value: number) => {
    startTransition(async () => {
      const result = await updateBookCurrentPage(userBook.id, value);
      if (result.error) {
        toast.error(result.error || t("errors.save"));
        setPage(saved.current);
      } else {
        saved.current = value;
      }
    });
  };

  const finish = (value: number) => {
    if (timer.current) clearTimeout(timer.current);
    beforeFinish.current = saved.current === value ? Math.max(0, value - 1) : saved.current;
    setFinished(true);
    persist(value);
    undoTimer.current = setTimeout(() => router.refresh(), UNDO_WINDOW);
  };

  const change = (value: number) => {
    setPage(value);
    if (total && value === total) {
      finish(value);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(value), SAVE_DELAY);
  };

  const undo = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const previous = beforeFinish.current;
    setFinished(false);
    setRating(null);
    setPage(previous);
    startTransition(async () => {
      const result = await reopenBook(userBook.id, previous);
      if (result.error) toast.error(result.error);
      else saved.current = previous;
    });
  };

  const rate = (value: number) => {
    setRating(value);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    startTransition(async () => {
      const result = await rateBook(userBook.id, value);
      if (result.error) toast.error(result.error);
      router.refresh();
    });
  };

  const toGo = total ? Math.max(0, total - page) : null;

  return (
    <section
      className={cn(
        "transition-[background-color] duration-400 ease-out motion-reduce:transition-none",
        finished ? "bg-paper text-ink" : "on-field bg-field",
      )}
    >
      {header}
      <div className="mx-auto w-full max-w-[1180px] px-5 pt-6 pb-7 md:px-10 md:pt-10 md:pb-12">
        <div className="grid grid-cols-[auto_1fr] items-end gap-x-5 md:gap-x-10">
          <Link
            href={`/books/${book.id}`}
            className="relative row-span-1 block md:row-span-2"
          >
            <Cover
              src={book.coverUrl}
              title={book.title}
              author={book.author}
              width={140}
              priority
              className="max-[380px]:!w-[104px] md:!w-[220px]"
              sizes="(min-width: 768px) 440px, 280px"
            />
            {finished && (
              <span className="absolute inset-x-0 top-[42%] flex justify-center">
                <Stamp size="md" animate className="md:text-[34px]">
                  {t("finished")}
                </Stamp>
              </span>
            )}
          </Link>

          <div className="min-w-0">
            <Popover open={editing} onOpenChange={setEditing}>
              <PopoverAnchor asChild>
                <div className="inline-block border-b-2 border-current pb-2">
                  <PageCounter
                    value={page}
                    max={total}
                    onChange={change}
                    onActivate={() => setEditing(true)}
                    label={t("pageCounter", { title: book.title })}
                    hint={t("pageHint")}
                    className="-ml-1 text-[120px] max-[380px]:text-[96px] md:text-[160px]"
                  />
                </div>
              </PopoverAnchor>
              <PopoverContent align="start" className="w-64 bg-paper text-ink">
                <PageEditor
                  page={page}
                  total={total}
                  onSave={(nextPage, nextTotal) => {
                    setEditing(false);
                    if (nextTotal && nextTotal !== total) {
                      setTotal(nextTotal);
                      startTransition(async () => {
                        const result = await updateBookPageCount(userBook.id, nextTotal);
                        if (result.error) toast.error(result.error);
                        if (nextPage !== page) change(Math.min(nextPage, nextTotal));
                      });
                    } else if (nextPage !== page) {
                      change(nextPage);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
            <p className="mt-3 text-[17px] font-semibold tracking-[-0.3px] tnum">
              {total ? (
                t("ofPages", { total })
              ) : (
                <button
                  type="button"
                  className="cursor-pointer underline underline-offset-4"
                  onClick={() => setEditing(true)}
                >
                  {t("noPageCount")}
                </button>
              )}
            </p>
            {toGo !== null && (
              <p className="mt-0.5 text-[15px] text-ink-2 tnum">
                {t("toGo", { count: toGo })}
              </p>
            )}
          </div>

          <div className="col-span-2 mt-4 md:col-span-1 md:col-start-2 md:mt-2 md:max-w-[480px] md:self-start">
            <Link href={`/books/${book.id}`} className="block hover:underline">
              <h2 className="font-disp text-[28px] leading-[1.05] font-extrabold tracking-[-0.4px] md:text-[36px]">
                {book.title}
              </h2>
            </Link>
            <p className="mt-0.5 text-[15px] text-ink-2">{book.author}</p>

            {finished ? (
              <div className="mt-5 animate-rise">
                <div className="flex items-center gap-4">
                  <StarPicker value={rating} onChange={rate} label={t("rateIt")} />
                  <span className="text-[15px] font-semibold">
                    {rating ? t("rated", { rating }) : t("rateIt")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={undo}
                  className="mt-4 cursor-pointer text-[15px] font-semibold text-pink-ink hover:underline"
                >
                  {t("undo")}
                </button>
              </div>
            ) : (
              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  aria-label={t("previousPage")}
                  disabled={page <= 0}
                  onClick={() => change(page - 1)}
                  className="grid size-[52px] flex-none cursor-pointer place-items-center rounded-full border-[1.5px] border-current disabled:opacity-40 dark:border-on-field-2"
                >
                  <Icon name="minus" />
                </button>
                <Capsule
                  variant="field"
                  className="flex-1"
                  disabled={!!total && page >= total}
                  onClick={() => change(page + 1)}
                >
                  <Icon name="plus" size={20} />
                  {t("nextPage")}
                </Capsule>
              </div>
            )}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function PageEditor({
  page,
  total,
  onSave,
}: {
  page: number;
  total: number | null;
  onSave: (page: number, total: number | null) => void;
}) {
  const t = useTranslations("shelf");
  const [p, setP] = useState(String(page));
  const [n, setN] = useState(total ? String(total) : "");
  const nextTotal = n ? Math.max(1, parseInt(n, 10) || 0) : null;
  const nextPage = Math.max(0, parseInt(p, 10) || 0);
  const invalid = nextTotal !== null && nextPage > nextTotal;
  const field =
    "mt-1 h-11 w-full rounded-xl border border-rule bg-input-bg px-3 text-[17px] tnum outline-none focus:border-ink";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid) onSave(nextPage, nextTotal);
      }}
      className="flex flex-col gap-3"
    >
      <p className="text-[15px] font-semibold">{t("editPages")}</p>
      <label className="text-[13px] font-semibold text-ink-2">
        {t("currentPage")}
        <input inputMode="numeric" autoFocus value={p} onChange={(e) => setP(e.target.value.replace(/\D/g, ""))} className={field} />
      </label>
      <label className="text-[13px] font-semibold text-ink-2">
        {t("pageCount")}
        <input inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, ""))} className={field} />
      </label>
      <Capsule type="submit" size="sm" disabled={invalid}>
        {t("save")}
      </Capsule>
    </form>
  );
}

/** Five ink stars to tap. */
export function StarPicker({
  value,
  onChange,
  label,
  size = 28,
}: {
  value: number | null;
  onChange: (value: number) => void;
  label: string;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1.5"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i}`}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
          className="cursor-pointer text-ink transition-transform hover:scale-110"
        >
          <Icon name="star" size={size} filled={i <= shown} strokeWidth={1.4} />
        </button>
      ))}
    </div>
  );
}
