import { db } from "@/db";
import { reviews } from "@/db/schema";
import { desc } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteReviewButton } from "@/components/admin/delete-review-button";

export default async function ReviewsModerationPage() {
  const allReviews = await db.query.reviews.findMany({
    orderBy: [desc(reviews.createdAt)],
    with: {
      user: true,
      book: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Review Moderation</h1>
        <p className="text-muted-foreground">
          Manage and moderate user reviews
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Book</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allReviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No reviews found
                </TableCell>
              </TableRow>
            ) : (
              allReviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="font-medium">
                    {review.user.username || review.user.email}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{review.book.title}</div>
                      <div className="text-sm text-muted-foreground">
                        by {review.book.author}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-2">{review.content}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={review.isPrivate ? "secondary" : "default"}>
                      {review.isPrivate ? "Private" : "Public"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DeleteReviewButton reviewId={review.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Total reviews: {allReviews.length}
      </div>
    </div>
  );
}
