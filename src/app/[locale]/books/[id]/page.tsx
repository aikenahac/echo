import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { BookDetail } from "@/components/book/book-detail";
import { getCatalogBookDetail } from "@/lib/book-detail";
import { isUuid } from "@/lib/utils";

// Shared by generateMetadata and the page within one request
const getDetail = cache(getCatalogBookDetail);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  const detail = isUuid(id) ? await getDetail(id, userId) : null;
  return detail
    ? { title: `${detail.book.title} · ${detail.book.author}` }
    : {};
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();

  const detail = isUuid(id) ? await getDetail(id, userId) : null;

  if (!detail) {
    notFound();
  }

  return (
    <BookDetail
      book={detail.book}
      userBook={detail.userBook}
      myReview={detail.myReview}
      followingReviews={detail.followingReviews}
      isAuthenticated={!!userId}
    />
  );
}
