import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Cover } from "@/components/echo/cover";
import type { UserBook } from "@/types";

/** A profile shelf: a row of covers with a "See all" link. */
export function Shelf({
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

/** "Reading now": the books in progress, on the pink field. */
export async function ReadingNowBand({
  books,
  className,
}: {
  books: UserBook[];
  className?: string;
}) {
  if (books.length === 0) return null;
  const t = await getTranslations("you");
  return (
    <section className={`on-field bg-field ${className ?? ""}`}>
      <div className="mx-auto w-full max-w-[1180px] px-5 pt-5 pb-6 md:px-10 md:py-8">
        <h2 className="text-[15px] font-semibold">{t("readingNow")}</h2>
        <ul className="mt-3.5 flex gap-3.5 overflow-x-auto pb-1 [scrollbar-width:none] md:gap-6">
          {books.map((ub) => {
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
  );
}
