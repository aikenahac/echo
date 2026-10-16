"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/routing";
import {
  addBookToLibrary,
  rateBook,
  removeBookFromLibrary,
  toggleBookFavorite,
  updateBookStatus,
} from "@/app/[locale]/actions/books";
import { AddToCollectionSheet } from "@/components/collections/add-to-collection-sheet";
import { AdminBadge } from "@/components/echo/admin-badge";
import { Capsule, IconButton, ToolbarButton, ToolbarGroup } from "@/components/echo/buttons";
import { Cover } from "@/components/echo/cover";
import { Icon } from "@/components/echo/icons";
import { AvatarTile, SectionHead } from "@/components/echo/primitives";
import { Stamp } from "@/components/echo/stamp";
import { ConfirmSheet } from "@/components/library/book-actions-menu";
import { ReadingHero, StarPicker } from "@/components/library/reading-hero";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PublicUser } from "@/lib/public-user";
import type { Book, ReadingStatus, Review, UserBookWithoutBook } from "@/types";
import { ReviewEditor } from "./review-editor";

type FollowingReview = Review & { user: PublicUser };

const DAY = 1000 * 60 * 60 * 24;

export function BookDetail({
  book,
  userBook,
  myReview,
  followingReviews,
  isAuthenticated,
}: {
  book: Book;
  userBook: UserBookWithoutBook | null;
  myReview: Review | null;
  followingReviews: FollowingReview[];
  isAuthenticated: boolean;
}) {
  const t = useTranslations("detail");
  const tShelf = useTranslations("shelf");
  const format = useFormatter();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [favourite, setFavourite] = useState(userBook?.isFavorite ?? false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(userBook?.rating ?? null);

  const run = (fn: () => Promise<{ error?: string }>, after?: () => void) =>
    startTransition(async () => {
      const result = await fn();
      if (result.error) toast.error(result.error);
      else after?.();
      router.refresh();
    });

  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push("/library");
  };

  const toolbar = (
    <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] md:px-10 md:pt-8">
      <IconButton label={t("back")} onClick={back}>
        <Icon name="back" />
      </IconButton>
      {userBook && (
        <ToolbarGroup>
          <ToolbarButton
            label={favourite ? t("unfavourite") : t("favourite")}
            aria-pressed={favourite}
            onClick={() => {
              const next = !favourite;
              setFavourite(next);
              run(() => toggleBookFavorite(userBook.id, next));
            }}
          >
            <Icon
              name="heart"
              filled={favourite}
              className={favourite ? "text-pink-ink" : undefined}
            />
          </ToolbarButton>
          <ToolbarButton label={t("addToCollection")} onClick={() => setCollectionOpen(true)}>
            <Icon name="folder" />
          </ToolbarButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ToolbarButton label={t("more")}>
                <Icon name="more" />
              </ToolbarButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmRemove(true)}>
                <Icon name="trash" size={18} />
                {t("remove")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ToolbarGroup>
      )}
    </div>
  );

  const started = userBook?.startedAt ? new Date(userBook.startedAt) : null;
  const finishedAt = userBook?.finishedAt ? new Date(userBook.finishedAt) : null;
  const shortDate = (d: Date) => format.dateTime(d, { day: "numeric", month: "short" });

  const meta = (
    <>
      <p className="text-[17px]">{book.author}</p>
      <p className="text-[15px] text-ink-2 tnum">
        {[book.publishedYear, book.pages ? t("pages", { count: book.pages }) : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </>
  );

  const reading = userBook?.status === "reading";

  return (
    <>
      {reading && userBook ? (
        <ReadingHero userBook={{ ...userBook, book }} header={toolbar} />
      ) : (
        <>
          {toolbar}
          <div className="mx-auto w-full max-w-[1180px] px-5 pt-5 md:px-10 md:pt-8">
            <div className="flex items-start gap-[18px] md:gap-10">
              <div className="relative flex-none pb-5">
                <Cover
                  src={book.coverUrl}
                  title={book.title}
                  author={book.author}
                  width={150}
                  priority
                  className="max-[380px]:!w-[120px] md:!w-[240px]"
                  sizes="(min-width: 768px) 480px, 300px"
                />
                {userBook && (
                  <StatusStamp
                    status={userBook.status}
                    onChange={(s) => run(() => updateBookStatus(userBook.id, s))}
                    onRemove={() => setConfirmRemove(true)}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <h1 className="font-disp text-[44px] leading-[.95] tracking-[-0.4px] break-words md:text-[64px]">
                  {book.title}
                </h1>
                <div className="mt-3">{meta}</div>
                {userBook?.status === "finished" && (
                  <div className="mt-4 md:mt-6">
                    <StarPicker
                      value={rating}
                      size={22}
                      label={t("yourRating")}
                      onChange={(v) => {
                        setRating(v);
                        run(() => rateBook(userBook.id, v));
                      }}
                    />
                    <p className="mt-1 text-[15px] text-ink-2">
                      {rating ? t("yourRating") : t("rateThis")}
                    </p>
                  </div>
                )}
                {started && finishedAt && (
                  <p className="mt-3 text-[15px] leading-5 text-ink-2 tnum">
                    {t("readInDays", {
                      days: Math.max(1, Math.round((finishedAt.getTime() - started.getTime()) / DAY)),
                    })}
                    <br />
                    {t("readRange", { start: shortDate(started), end: shortDate(finishedAt) })}
                  </p>
                )}
                {!userBook && isAuthenticated && (
                  <AddToLibrary book={book} />
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mx-auto w-full max-w-[1180px] px-5 pb-12 md:px-10">
        {!isAuthenticated ? (
          <div className="mt-8 hairline-t pt-8">
            <p className="max-w-[46ch] text-[17px] leading-6">{t("signIn")}</p>
            <Capsule asChild className="mt-4">
              <Link href="/sign-in">{t("signInButton")}</Link>
            </Capsule>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 lg:gap-16">
            <section className="mt-8 hairline-t pt-8">
              <div className="flex items-baseline justify-between">
                <SectionHead>{t("yourReview")}</SectionHead>
                {userBook && (
                  <button
                    type="button"
                    onClick={() => setEditorOpen(true)}
                    className="cursor-pointer text-[15px] font-semibold text-pink-ink hover:underline"
                  >
                    {myReview ? t("edit") : t("write")}
                  </button>
                )}
              </div>
              {myReview ? (
                <>
                  <p className="mt-2.5 text-[15px] text-ink-2">
                    {myReview.isPrivate ? t("private") : t("public")} ·{" "}
                    {shortDate(new Date(myReview.updatedAt ?? myReview.createdAt))}
                  </p>
                  <p className="mt-2.5 text-[17px] leading-6 tracking-[-0.3px] whitespace-pre-line">
                    {myReview.content}
                  </p>
                </>
              ) : (
                <p className="mt-2.5 text-[15px] leading-5 text-ink-2">
                  {userBook ? t("noReview") : t("addTo")}
                </p>
              )}
            </section>

            <section className="mt-8 hairline-t pt-8">
              <SectionHead>{t("fromFollowing")}</SectionHead>
              {followingReviews.length === 0 ? (
                <p className="mt-2.5 text-[15px] text-ink-2">{t("noFollowingReviews")}</p>
              ) : (
                <ul className="mt-3">
                  {followingReviews.map((r) => {
                    const name = r.user.displayName || r.user.username || "?";
                    return (
                      <li key={r.id} className="flex gap-3 py-3.5 [&+li]:hairline-t">
                        <AvatarTile name={name} src={r.user.profilePictureUrl} blurhash={r.user.profilePictureBlurhash} />
                        <div className="min-w-0">
                          <p className="text-[15px]">
                            <b className="font-semibold">{name}</b>
                            {r.user.isAdmin && <AdminBadge size={13} className="-mt-0.5 ml-1" />}
                            <span className="text-ink-2"> · {shortDate(new Date(r.createdAt))}</span>
                          </p>
                          <p className="mt-0.5 text-[15px] leading-[21px] whitespace-pre-line">{r.content}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>

      {userBook && (
        <>
          <AddToCollectionSheet
            userBookId={userBook.id}
            bookTitle={book.title}
            open={collectionOpen}
            onOpenChange={setCollectionOpen}
          />
          <ConfirmSheet
            open={confirmRemove}
            onOpenChange={setConfirmRemove}
            title={tShelf("actions.removeConfirmTitle", { title: book.title })}
            body={tShelf("actions.removeConfirm")}
            confirmLabel={tShelf("actions.remove")}
            cancelLabel={tShelf("actions.cancel")}
            onConfirm={() => {
              setConfirmRemove(false);
              run(() => removeBookFromLibrary(userBook.id));
            }}
          />
          <ReviewEditor
            key={myReview?.updatedAt?.toString() ?? "new"}
            open={editorOpen}
            onOpenChange={setEditorOpen}
            book={book}
            userBook={userBook}
            review={myReview}
          />
        </>
      )}
    </>
  );
}

/** The status as an ink stamp on the cover; opens the status menu. */
function StatusStamp({
  status,
  onChange,
  onRemove,
}: {
  status: ReadingStatus;
  onChange: (status: ReadingStatus) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("detail");
  const tShelf = useTranslations("shelf");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("statusMenu")}
        className="absolute bottom-0 left-2 cursor-pointer md:left-4"
      >
        <Stamp size="md" className="max-[380px]:text-[17px]">
          {tShelf(`shelves.${status}`)}
          <Icon name="chev" size={14} strokeWidth={2.4} />
        </Stamp>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={status} onValueChange={(v) => onChange(v as ReadingStatus)}>
          {(["want", "reading", "finished"] as const).map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              {tShelf(`shelves.${s}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onRemove}>
          {tShelf("actions.remove")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Want / Reading / Finished capsules for a book not in the library yet. */
function AddToLibrary({ book }: { book: Book }) {
  const t = useTranslations("detail");
  const tShelf = useTranslations("shelf");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="mt-5">
      <p className="text-[13px] font-semibold text-ink-2">{t("addTo")}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(["want", "reading", "finished"] as const).map((s, i) => (
          <Capsule
            key={s}
            size="xs"
            variant={i === 0 ? "outline" : "quiet"}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await addBookToLibrary(
                  { bookId: book.id },
                  s,
                );
                if (result.error) toast.error(result.error);
                router.refresh();
              })
            }
          >
            {s === "want" && <Icon name="plus" size={14} strokeWidth={2} />}
            {tShelf(`shelves.${s}`)}
          </Capsule>
        ))}
      </div>
    </div>
  );
}
