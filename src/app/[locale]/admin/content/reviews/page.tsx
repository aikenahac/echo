import { ReviewsDataTable } from "@/components/admin/reviews-data-table";
import { listReviewsAdmin } from "@/app/[locale]/actions/admin";
import type { RawTableParams } from "@/lib/admin-table";

export default async function ReviewsModerationPage({
  searchParams,
}: {
  searchParams: Promise<RawTableParams>;
}) {
  const initial = await listReviewsAdmin(await searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Review Moderation</h1>
        <p className="text-muted-foreground">
          Manage and moderate user reviews
        </p>
      </div>

      <ReviewsDataTable initial={initial} />
    </div>
  );
}
