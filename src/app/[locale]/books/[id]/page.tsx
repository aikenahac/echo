import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { BookDetails } from "@/components/book-details";
import { getCatalogBookDetail } from "@/lib/book-detail";
import { isUuid } from "@/lib/utils";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();

  const detail = isUuid(id) ? await getCatalogBookDetail(id, userId) : null;

  if (!detail) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BookDetails
        book={detail.book}
        userBook={detail.userBook}
        userReview={detail.myReview}
        friendReviews={detail.followingReviews}
        isAuthenticated={!!userId}
      />
    </div>
  );
}
