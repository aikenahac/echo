"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { rateBook } from "@/app/[locale]/actions/books";
import {
  createOrUpdateReview,
  deleteReview,
} from "@/app/[locale]/actions/reviews";
import { Cover } from "@/components/echo/cover";
import { Sheet, SheetContent } from "@/components/echo/sheet";
import { Switch } from "@/components/echo/switch";
import { ConfirmSheet } from "@/components/library/book-actions-menu";
import { StarPicker } from "@/components/library/reading-hero";
import type { Book, Review, UserBookWithoutBook } from "@/types";

const MAX = 10000;

/**
 * Write or edit your review: book row, stars (saved on their own through the
 * rating action), the text with a counter, Private, and Delete.
 */
export function ReviewEditor({
  open,
  onOpenChange,
  book,
  userBook,
  review,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: Book;
  userBook: UserBookWithoutBook | null;
  review: Review | null;
}) {
  const t = useTranslations("detail.editor");
  const format = useFormatter();
  const router = useRouter();
  const [content, setContent] = useState(review?.content ?? "");
  const [isPrivate, setIsPrivate] = useState(review?.isPrivate ?? false);
  const [rating, setRating] = useState<number | null>(userBook?.rating ?? null);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await createOrUpdateReview(book.id, content, isPrivate);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("saved"));
      onOpenChange(false);
      router.refresh();
    });

  const rate = (value: number) => {
    if (!userBook) return;
    setRating(value);
    startTransition(async () => {
      const result = await rateBook(userBook.id, value);
      if (result.error) toast.error(result.error);
      router.refresh();
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          title={t("title")}
          size="lg"
          onDone={save}
          doneDisabled={pending || !content.trim() || content.length > MAX}
          doneLabel={t("save")}
          closeLabel={t("cancel")}
          className="max-md:top-2"
        >
          <div className="flex items-center gap-3">
            <Cover width={40} src={book.coverUrl} title={book.title} author={book.author} />
            <div className="min-w-0">
              <p className="font-disp truncate text-[22px] leading-[1.05] font-extrabold">{book.title}</p>
              <p className="truncate text-[13px] text-ink-2">
                {book.author}
                {userBook?.finishedAt
                  ? ` · ${t("finishedOn", {
                      date: format.dateTime(new Date(userBook.finishedAt), { day: "numeric", month: "short" }),
                    })}`
                  : ""}
              </p>
            </div>
          </div>
          {userBook && (
            <div className="mt-5">
              <StarPicker value={rating} onChange={rate} label={t("rating")} size={30} />
            </div>
          )}
          <div className="mt-5 rounded-xl border border-rule bg-input-bg p-4 focus-within:border-ink">
            <textarea
              aria-label={t("title")}
              placeholder={t("placeholder")}
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[220px] w-full resize-none bg-transparent text-[17px] leading-6 tracking-[-0.3px] caret-pink-ink outline-none placeholder:text-ink-3 md:min-h-[280px]"
            />
            <p className={content.length > MAX ? "text-right text-[13px] text-negative tnum" : "text-right text-[13px] text-ink-3 tnum"}>
              {t("counter", { count: content.length.toLocaleString() })}
            </p>
          </div>
          <div className="mt-5 hairline-t pt-4">
            <label className="flex items-center justify-between gap-4">
              <span className="text-[17px]">{t("privateLabel")}</span>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </label>
            <p className="mt-1.5 text-[13px] leading-[18px] text-ink-2">
              {isPrivate ? t("privateHelpOn") : t("privateHelpOff")}
            </p>
          </div>
          {review && (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="mt-8 w-full cursor-pointer py-3 text-center text-[17px] font-semibold text-negative"
            >
              {t("delete")}
            </button>
          )}
        </SheetContent>
      </Sheet>
      {review && (
        <ConfirmSheet
          open={confirm}
          onOpenChange={setConfirm}
          title={t("deleteConfirmTitle")}
          body={t("deleteConfirm")}
          confirmLabel={t("delete")}
          cancelLabel={t("cancel")}
          onConfirm={() =>
            startTransition(async () => {
              const result = await deleteReview(review.id);
              setConfirm(false);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success(t("deleted"));
              setContent("");
              onOpenChange(false);
              router.refresh();
            })
          }
        />
      )}
    </>
  );
}
