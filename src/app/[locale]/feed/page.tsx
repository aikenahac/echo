import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { db } from "@/db";
import { follows, userBooks, reviews } from "@/db/schema";
import { eq, and, inArray, desc, or } from "drizzle-orm";

export default async function FeedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get list of users the current user follows
  const following = await db.query.follows.findMany({
    where: eq(follows.followerId, userId),
  });

  const followingIds = following.map((f) => f.followingId);

  if (followingIds.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Activity Feed</h1>
        <div className="text-center py-12 text-muted-foreground">
          <p>Your feed is empty!</p>
          <p className="text-sm mt-2">
            Follow other users to see their reading activity here.
          </p>
          <a
            href="/users/search"
            className="inline-block mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Find Users to Follow
          </a>
        </div>
      </div>
    );
  }

  // Fetch recent activities from followed users
  const recentBooks = await db.query.userBooks.findMany({
    where: and(
      inArray(userBooks.userId, followingIds),
      or(eq(userBooks.status, "reading"), eq(userBooks.status, "finished"))
    ),
    with: {
      book: true,
      user: true,
    },
    orderBy: [desc(userBooks.updatedAt)],
    limit: 20,
  });

  const recentReviews = await db.query.reviews.findMany({
    where: and(
      inArray(reviews.userId, followingIds),
      eq(reviews.isPrivate, false)
    ),
    with: {
      book: true,
      user: true,
    },
    orderBy: [desc(reviews.createdAt)],
    limit: 10,
  });

  // Combine and sort activities
  const activities: Array<{
    type: "book" | "review";
    date: Date;
    data: any;
  }> = [
    ...recentBooks.map((ub) => ({
      type: "book" as const,
      date: ub.updatedAt,
      data: ub,
    })),
    ...recentReviews.map((r) => ({
      type: "review" as const,
      date: r.createdAt,
      data: r,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Activity Feed</h1>
      <div className="space-y-6">
        {activities.map((activity, index) => (
          <div key={index} className="border rounded-lg p-6 space-y-3">
            {activity.type === "book" && (
              <>
                <div className="flex items-start gap-4">
                  {activity.data.book.coverUrl && (
                    <div className="relative w-16 h-24 flex-shrink-0">
                      <Image
                        src={activity.data.book.coverUrl}
                        alt={activity.data.book.title}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">
                      {activity.data.user.username || activity.data.user.email}
                    </p>
                    <p className="font-medium">
                      {activity.data.status === "finished"
                        ? "finished reading"
                        : "started reading"}
                    </p>
                    <a
                      href={`/books/${activity.data.bookId}`}
                      className="text-lg font-semibold hover:underline"
                    >
                      {activity.data.book.title}
                    </a>
                    <p className="text-sm text-muted-foreground">
                      by {activity.data.book.author}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(activity.date).toLocaleDateString()} at{" "}
                  {new Date(activity.date).toLocaleTimeString()}
                </p>
              </>
            )}
            {activity.type === "review" && (
              <>
                <div className="flex items-start gap-4">
                  {activity.data.book.coverUrl && (
                    <div className="relative w-16 h-24 flex-shrink-0">
                      <Image
                        src={activity.data.book.coverUrl}
                        alt={activity.data.book.title}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">
                      {activity.data.user.username || activity.data.user.email}
                    </p>
                    <p className="font-medium">reviewed</p>
                    <a
                      href={`/books/${activity.data.bookId}`}
                      className="text-lg font-semibold hover:underline"
                    >
                      {activity.data.book.title}
                    </a>
                    <p className="text-sm mt-2 line-clamp-3">
                      {activity.data.content}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(activity.date).toLocaleDateString()} at{" "}
                  {new Date(activity.date).toLocaleTimeString()}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
